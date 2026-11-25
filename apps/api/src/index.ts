import { CHENNAI_SCENARIO, assertChennaiStorage } from "@kaz/shared"

import { createServer } from "./server.js"

const port = Number(process.env.PORT ?? 4000)
const chennai = process.env.SIMULATION_SCENARIO === CHENNAI_SCENARIO
if (chennai) assertChennaiStorage(process.env.DATABASE_URL, process.env.REDIS_URL)
const app = createServer()
const ready = () => console.log(`[api] kazindustries phase-one demo listening on http://localhost:${port}`)

if (chennai) app.listen(port, "localhost", ready)
else app.listen(port, ready)
