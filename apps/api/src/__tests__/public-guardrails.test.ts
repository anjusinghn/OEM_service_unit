import { afterAll, describe, expect, it, vi } from "vitest"
import supertest from "supertest"

vi.mock("@kaz/db", () => ({
  aiReasoningQueue: {},
  apiKeyRepository: { verify: vi.fn() },
  dashboardChannel: "channel:dashboard",
  depotMatchQueue: {},
  faultEventsQueue: {},
  healthRecomputeQueue: {},
  notificationsQueue: {},
  priorityRerankQueue: {},
  subscribe: vi.fn(),
  telemetryIngestQueue: {},
  userRepository: {
    findById: vi.fn(),
    verifyPassword: vi.fn()
  }
}))

vi.mock("../repository-store.js", () => ({
  repositoryStore: {
    completeRequest: vi.fn(),
    getDispatchPlan: vi.fn().mockResolvedValue(null),
    getDashboardPayload: vi.fn().mockResolvedValue({ vehicles: [] })
  }
}))

process.env.USE_DEMO_STORE = "true"
process.env.PUBLIC_DEMO = "true"

import { createServer } from "../server.js"
import { repositoryStore } from "../repository-store.js"

const app = createServer({
  allowMutations: false,
  exposeQueueAdmin: false,
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
  maxSsePerIp: 1,
  maxSseClients: 2
})
const request = supertest(app)

describe("public guardrails", () => {
  it("serves reads without a token", async () => {
    const response = await request.get("/api/v1/dashboard")
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.vehicles)).toBe(true)
  })

  it("keeps public dispatch previews read-only", async () => {
    await request.get("/api/v1/orchestration/vehicles/veh-001/dispatch-plan")
    expect(repositoryStore.getDispatchPlan).toHaveBeenCalledWith("veh-001", true)
  })

  it("refuses writes that would change fleet state", async () => {
    const reset = await request.post("/api/v1/demo/reset")
    expect(reset.status).toBe(403)
    expect(reset.body).toEqual({ error: "This deployment is read-only" })

    const login = await request
      .post("/api/v1/auth/login")
      .send({ email: "admin@kazindustries.dev", password: "kazadmin123" })
    expect(login.status).toBe(403)
  })

  it("hides the queue admin board", async () => {
    const response = await request.get("/admin/queues")
    expect(response.status).toBe(404)
  })

  it("rejects oversized and malformed bodies", async () => {
    const oversized = await request
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send(`{"email":"${"a".repeat(20_000)}"}`)
    expect(oversized.status).toBe(413)

    const malformed = await request
      .post("/api/v1/demo/reset")
      .set("Content-Type", "application/json")
      .send("{")
    expect(malformed.status).toBe(400)
    expect(malformed.body).toEqual({ error: "Malformed JSON" })
  })

  it("rejects absurdly long URLs and TRACE", async () => {
    const longUrl = await request.get(`/health?q=${"a".repeat(2100)}`)
    expect(longUrl.status).toBe(414)

    const trace = await request.trace("/health")
    expect(trace.status).toBe(405)
  })

  it("rate limits a single client", async () => {
    const limited = createServer({
      allowMutations: false,
      rateLimitMax: 2,
      rateLimitWindowMs: 60_000
    })
    const client = supertest(limited)
    expect((await client.get("/health")).status).toBe(200)
    expect((await client.get("/health")).status).toBe(200)
    const blocked = await client.get("/health")
    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({ error: "Too many requests" })
  })
})

describe("live connection cap", () => {
  let server: ReturnType<typeof app.listen>
  let port = 0

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it("refuses a second event stream from the same client", async () => {
    server = app.listen(0)
    await new Promise<void>((resolve) => server.once("listening", () => resolve()))
    const address = server.address()
    port = typeof address === "object" && address ? address.port : 0

    const first = await fetch(`http://127.0.0.1:${port}/api/v1/events`)
    const second = await fetch(`http://127.0.0.1:${port}/api/v1/events`)
    expect(first.status).toBe(200)
    expect(second.status).toBe(503)
    await first.body?.cancel()
    await second.body?.cancel()
  })
})
