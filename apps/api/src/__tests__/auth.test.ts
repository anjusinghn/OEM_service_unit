import express from "express"
import jwt from "jsonwebtoken"
import supertest from "supertest"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { requireAuth, requireAuthOrApiKey, requireRole, signToken, verifyToken } from "../auth.js"
import type { AuthPayload } from "../auth.js"

const { apiKeyVerifyMock, userFindByIdMock, userVerifyPasswordMock } = vi.hoisted(() => ({
  apiKeyVerifyMock: vi.fn().mockResolvedValue(null),
  userFindByIdMock: vi.fn().mockResolvedValue(null),
  userVerifyPasswordMock: vi.fn().mockResolvedValue(null)
}))

vi.mock("@kaz/db", () => ({
  apiKeyRepository: { verify: apiKeyVerifyMock },
  userRepository: {
    findById: userFindByIdMock,
    verifyPassword: userVerifyPasswordMock
  }
}))

const testPayload: AuthPayload = {
  userId: "user-admin-001",
  email: "admin@kazindustries.dev",
  role: "PLATFORM_ADMIN",
  organizationId: "org-kazindustries-demo"
}

function createTestApp() {
  const app = express()

  app.get("/require-auth", requireAuth, (req, res) => {
    res.json({ auth: req.auth })
  })

  app.get("/require-role", requireRole("PLATFORM_ADMIN"), (req, res) => {
    res.json({ role: req.auth?.role })
  })

  app.get("/require-auth-and-role", requireAuth, requireRole("PLATFORM_ADMIN"), (req, res) => {
    res.json({ role: req.auth?.role })
  })

  app.get("/require-auth-or-api-key", requireAuthOrApiKey, (req, res) => {
    res.json({ auth: req.auth })
  })

  return supertest(app)
}

beforeEach(() => {
  vi.clearAllMocks()
  apiKeyVerifyMock.mockResolvedValue(null)
  userFindByIdMock.mockResolvedValue(null)
  userVerifyPasswordMock.mockResolvedValue(null)
})

describe("auth - JWT token operations", () => {
  it("signs a token and verifies it back to the same payload", () => {
    const token = signToken(testPayload)
    expect(token).toBeDefined()
    expect(typeof token).toBe("string")
    expect(token.split(".")).toHaveLength(3)

    const decoded = verifyToken(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.userId).toBe(testPayload.userId)
    expect(decoded!.email).toBe(testPayload.email)
    expect(decoded!.role).toBe(testPayload.role)
    expect(decoded!.organizationId).toBe(testPayload.organizationId)
  })

  it("returns null for an invalid token", () => {
    expect(verifyToken("invalid.token.here")).toBeNull()
  })

  it("returns null for an empty string", () => {
    expect(verifyToken("")).toBeNull()
  })

  it("returns null for a tampered token", () => {
    const token = signToken(testPayload)
    const tampered = token.slice(0, -5) + "XXXXX"
    expect(verifyToken(tampered)).toBeNull()
  })

  it("includes standard JWT claims (iat, exp)", () => {
    const token = signToken(testPayload)
    const decoded = verifyToken(token)
    expect(decoded).toHaveProperty("iat")
    expect(decoded).toHaveProperty("exp")
  })
})

describe("auth - role types", () => {
  const roles = ["PLATFORM_ADMIN", "OEM_ADMIN", "DEPOT_MANAGER", "TECHNICIAN", "VIEWER"] as const

  it.each(roles)("signs a token with role %s", (role) => {
