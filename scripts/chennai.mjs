import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:net"
import { fileURLToPath } from "node:url"

const cwd = fileURLToPath(new URL("..", import.meta.url))
const args = process.argv.slice(2)
const allowed = ["--with-part", "--without-part", "--seed-only", "--reset"]
if (args.some((arg) => !allowed.includes(arg)) || args.includes("--with-part") && args.includes("--without-part")) {
  throw new Error("Use --seed-only, --reset, and at most one of --with-part or --without-part.")
}
const inStock = args.includes("--with-part") ? "true" : args.includes("--without-part") ? "false" : undefined
const env = {
  ...process.env,
  SIMULATION_SCENARIO: "chennai-ashok-leyland",
  DATABASE_URL: "postgresql://postgres:chennai-local@127.0.0.1:5548/oem_chennai_demo",
  REDIS_URL: "redis://127.0.0.1:6388",
  PORT: "4116",
  WEB_PORT: "3116",
  API_PROXY_URL: "http://localhost:4116",
  NEXT_PUBLIC_CHENNAI_DEMO: "true",
  CHENNAI_DEMO_ORIGIN: "http://localhost:3116",
  CHENNAI_DEMO_PASSWORD: "kazadmin123",
  JWT_SECRET: randomBytes(32).toString("hex"),
  PUBLIC_DEMO: "false",
  ALLOW_MUTATIONS: "true",
  USE_DEMO_STORE: "false",
  AI_ENABLED: process.env.AI_ENABLED ?? "false"
}
if (inStock !== undefined) env.CHENNAI_NEAR_PART_IN_STOCK = inStock
const compose = ["compose", "-f", "infra/docker/chennai-compose.yml"]

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" })
    const stop = () => child.kill("SIGTERM")
    process.on("SIGINT", stop)
    process.on("SIGTERM", stop)
    child.once("error", reject)
    child.once("exit", (code, signal) => {
      process.off("SIGINT", stop)
      process.off("SIGTERM", stop)
      if (signal || code === 0) resolve()
      else reject(new Error(`${command} exited with status ${code}`))
    })
  })
}

if (!args.includes("--seed-only") || args.includes("--reset")) {
  for (const port of [Number(env.PORT), Number(env.WEB_PORT)]) {
    await new Promise((resolve, reject) => {
      const server = createServer()
      server.once("error", () => reject(new Error(`Port ${port} is already in use. Stop that process before starting or resetting the Chennai demo.`)))
      server.listen(port, "localhost", () => server.close(resolve))
    })
  }
}
if (args.includes("--reset")) await run("docker", [...compose, "down", "--volumes"])
await run("docker", [...compose, "up", "-d", "--wait"])
await run("pnpm", ["--filter", "@kaz/db", "db:push"])
await run("pnpm", ["--filter", "@kaz/db", "db:seed"])
if (!args.includes("--seed-only")) {
  console.log("Chennai dashboard: http://localhost:3116")
  await run("node", ["dev.mjs"])
}
