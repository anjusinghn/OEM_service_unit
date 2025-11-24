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

