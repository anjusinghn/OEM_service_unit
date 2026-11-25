import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"
import supertest from "supertest"

const { apiKeyVerifyMock, userFindByIdMock, userVerifyPasswordMock } = vi.hoisted(() => ({
  apiKeyVerifyMock: vi.fn().mockResolvedValue(null),
  userFindByIdMock: vi.fn().mockResolvedValue(null),
  userVerifyPasswordMock: vi.fn().mockResolvedValue(null)
}))

vi.mock("@kaz/db", () => ({
  aiReasoningQueue: {},
  apiKeyRepository: { verify: apiKeyVerifyMock },
  dashboardChannel: "channel:dashboard",
  depotMatchQueue: {},
  faultEventsQueue: {},
  healthRecomputeQueue: {},
  notificationsQueue: {},
  priorityRerankQueue: {},
  subscribe: vi.fn(),
  telemetryIngestQueue: {},
  userRepository: {
    findById: userFindByIdMock,
    verifyPassword: userVerifyPasswordMock
  }
}))

vi.mock("../repository-store.js", () => ({
  repositoryStore: {
    completeRequest: vi.fn(),
    getDispatchPlan: vi.fn().mockResolvedValue(null)
  }
}))

import { signToken, type AuthPayload } from "../auth.js"
import { createServer } from "../server.js"
import { demoStore } from "../store.js"

process.env.USE_DEMO_STORE = "true"
process.env.ALLOW_MUTATIONS = "true"
process.env.PUBLIC_DEMO = "false"

const adminPayload: AuthPayload = {
  userId: "user-admin-001",
  email: "admin@kazindustries.dev",
  role: "PLATFORM_ADMIN",
  organizationId: "org-kazindustries-demo"
}

const managerPayload: AuthPayload = {
  userId: "user-manager-001",
  email: "manager@kazindustries.dev",
  role: "DEPOT_MANAGER",
  organizationId: "org-kazindustries-demo"
}

const viewerPayload: AuthPayload = {
  userId: "user-viewer-001",
  email: "viewer@kazindustries.dev",
  role: "VIEWER",
  organizationId: "org-kazindustries-demo"
}

const adminToken = signToken(adminPayload)
const managerToken = signToken(managerPayload)
const viewerToken = signToken(viewerPayload)

const app = createServer()
const request = supertest(app)

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` }
}

function getDispatchableVehicleId(): string {
  const vehicle = demoStore
    .getVehicles()
    .find(
      (entry) =>
        entry.currentRequest === null &&
        entry.priority !== null &&
        entry.depotRecommendations.length > 0
    )

  if (!vehicle) {
    throw new Error("Expected a dispatchable vehicle in the demo store")
  }

  return vehicle.id
}

beforeEach(() => {
  demoStore.reset()
  apiKeyVerifyMock.mockResolvedValue(null)
  userFindByIdMock.mockResolvedValue(null)
  userVerifyPasswordMock.mockResolvedValue(null)
  vi.clearAllMocks()
})

afterAll(() => {
  demoStore.dispose()
})

describe("api integration", () => {
  describe("auth endpoints", () => {
    it("returns 400 for login requests missing email or password", async () => {
      const response = await request.post("/api/v1/auth/login").send({ email: "admin@kazindustries.dev" })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({ error: "Email and password are required" })
      expect(userVerifyPasswordMock).not.toHaveBeenCalled()
    })

    it("returns 401 for invalid login credentials", async () => {
      const response = await request
        .post("/api/v1/auth/login")
        .send({ email: "admin@kazindustries.dev", password: "wrong-password" })

      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: "Invalid email or password" })
      expect(userVerifyPasswordMock).toHaveBeenCalledWith("admin@kazindustries.dev", "wrong-password")
    })

    it("returns 401 for /auth/me without an auth header", async () => {
      const response = await request.get("/api/v1/auth/me")

      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: "Authentication required" })
    })

    it("returns 401 for /auth/me with an invalid token", async () => {
      const response = await request
        .get("/api/v1/auth/me")
        .set("Authorization", "Bearer invalid.token.here")

      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: "Invalid or expired token" })
    })
  })

  describe("protected endpoints", () => {
    it.each([
      "/api/v1/dashboard",
      "/api/v1/vehicles",
      "/api/v1/orchestration/priority-queue",
      "/api/v1/service-requests",
      "/api/v1/intelligence",
      "/api/v1/forensics/cohorts",
      "/api/v1/forensics/anomalies",
      "/api/v1/forensics/patterns"
    ])("rejects unauthenticated access to %s", async (path) => {
      const response = await request.get(path)

      expect(response.status).toBe(401)
      expect(response.body).toEqual({ error: "Authentication required" })
    })

    it("returns the dashboard payload with a valid JWT", async () => {
      const response = await request.get("/api/v1/dashboard").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(response.body).toEqual(
        expect.objectContaining({
          vehicles: expect.any(Array),
          serviceRequests: expect.any(Array),
          generatedAt: expect.any(String)
        })
      )
    })

    it("returns vehicles with a valid JWT", async () => {
      const response = await request.get("/api/v1/vehicles").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it("returns the priority queue with a valid JWT", async () => {
      const response = await request
        .get("/api/v1/orchestration/priority-queue")
        .set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it("returns service requests with a valid JWT", async () => {
      const response = await request.get("/api/v1/service-requests").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it("returns intelligence data with a valid JWT", async () => {
      const response = await request.get("/api/v1/intelligence").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(response.body).toEqual(
        expect.objectContaining({
          rewardSignals: expect.any(Array),
          overrideRate: expect.any(Number)
        })
      )
    })

    it("returns forensics cohorts with a valid JWT", async () => {
      const response = await request.get("/api/v1/forensics/cohorts").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it("returns forensics anomalies with a valid JWT", async () => {
      const response = await request.get("/api/v1/forensics/anomalies").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it("returns forensics patterns with a valid JWT", async () => {
      const response = await request.get("/api/v1/forensics/patterns").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe("rbac endpoints", () => {
    it("rejects demo reset for viewer tokens", async () => {
      const response = await request.post("/api/v1/demo/reset").set(authHeader(viewerToken))

      expect(response.status).toBe(403)
      expect(response.body).toEqual({ error: "Insufficient permissions" })
    })

    it("allows demo reset for platform admin tokens", async () => {
      const response = await request.post("/api/v1/demo/reset").set(authHeader(adminToken))

      expect(response.status).toBe(200)
      expect(response.body).toEqual(
        expect.objectContaining({
          vehicles: expect.any(Array),
          generatedAt: expect.any(String)
        })
      )
    })

    it("rejects dispatch for viewer tokens", async () => {
      const response = await request
        .post(`/api/v1/orchestration/vehicles/${getDispatchableVehicleId()}/dispatch`)
        .set(authHeader(viewerToken))
        .send({})

      expect(response.status).toBe(403)
      expect(response.body).toEqual({ error: "Insufficient permissions" })
    })

    it("allows dispatch for depot manager tokens", async () => {
      const vehicleId = getDispatchableVehicleId()
      const response = await request
        .post(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch`)
        .set(authHeader(managerToken))
        .send({})

      expect(response.status).toBe(200)
      expect(response.body).toEqual(
        expect.objectContaining({
          request: expect.objectContaining({ vehicleId }),
          livePulse: expect.any(Object)
        })
      )
    })
  })

  describe("public endpoints", () => {
    it("returns a health response without auth", async () => {
      const response = await request.get("/health")

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ status: "ok", name: "fleet-command-api", phase: "phase-6" })
    })
  })
})
