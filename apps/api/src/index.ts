import { CHENNAI_SCENARIO, assertChennaiStorage } from "@kaz/shared"

import { createServer } from "./server.js"

const port = Number(process.env.PORT ?? 4000)
const chennai = process.env.SIMULATION_SCENARIO === CHENNAI_SCENARIO
if (chennai) assertChennaiStorage(process.env.DATABASE_URL, process.env.REDIS_URL)
const host = chennai ? "localhost" : process.env.HOST ?? "0.0.0.0"
const app = createServer()
const server = app.listen(port, host, () => {
  console.log(`[api] Fleet Command listening on http://${host}:${port}`)
})

server.requestTimeout = 20_000
server.headersTimeout = 10_000
server.keepAliveTimeout = 5_000
server.maxRequestsPerSocket = 200
