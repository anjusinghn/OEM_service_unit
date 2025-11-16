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
