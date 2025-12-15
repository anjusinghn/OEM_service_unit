import net from "node:net"
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const services = []
let shuttingDown = false

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env")
  if (!existsSync(envPath)) {
    return {}
  }

  const raw = readFileSync(envPath, "utf8")
  const parsed = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    parsed[key] = value
  }

  return parsed
}

const runtimeEnv = {
  ...loadDotEnv(),
  ...process.env
}

function prefixStream(stream, label) {
  let buffer = ""

  stream.on("data", (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (line.length > 0) {
        process.stdout.write(`[${label}] ${line}\n`)
      }
    }
  })

  stream.on("end", () => {
    if (buffer.length > 0) {
      process.stdout.write(`[${label}] ${buffer}\n`)
    }
  })
}

function startService(label, args) {
  const child = spawn("pnpm", args, {
    cwd: process.cwd(),
    env: runtimeEnv,
    stdio: ["inherit", "pipe", "pipe"]
  })

  prefixStream(child.stdout, label)
  prefixStream(child.stderr, label)

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`
    process.stderr.write(`[orchestrator] ${label} exited unexpectedly (${reason}). Stopping all services.\n`)
    shutdown(code ?? 1)
  })

  services.push({ label, child })
  return child
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 90000) {
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const socket = new net.Socket()

      socket.setTimeout(1000)

      socket.once("connect", () => {
        socket.destroy()
        resolve(true)
      })

      const retry = () => {
        socket.destroy()
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for ${host}:${port}`))
          return
        }
        setTimeout(tryConnect, 1000)
      }

      socket.once("error", retry)
      socket.once("timeout", retry)
      socket.connect(port, host)
    }

    tryConnect()
  })
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true

  for (const service of services) {
    if (!service.child.killed) {
      service.child.kill("SIGTERM")
    }
  }

  setTimeout(() => {
    for (const service of services) {
      if (!service.child.killed) {
        service.child.kill("SIGKILL")
      }
    }
    process.exit(exitCode)
  }, 1500).unref()
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))

async function main() {
  process.stdout.write("[orchestrator] starting web, api, and simulator first...\n")

  startService("web", ["--filter", "@kaz/web", "dev"])
  startService("api", ["--filter", "@kaz/api", "dev"])
  startService("simulator", ["--filter", "@kaz/simulator", "dev"])

  process.stdout.write("[orchestrator] waiting for frontend on :3000 and api on :4000 before starting worker...\n")

  await Promise.all([waitForPort(3000), waitForPort(4000)])

  process.stdout.write("[orchestrator] web and api are reachable. starting worker last...\n")
  startService("worker", ["--filter", "@kaz/worker", "dev"])
}

main().catch((error) => {
  process.stderr.write(`[orchestrator] ${error instanceof Error ? error.message : String(error)}\n`)
  shutdown(1)
})
