import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

function loadDotEnv() {
  const envPath = path.resolve(__dirname, "../../../../.env")
  if (!existsSync(envPath)) {
    return
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    if (process.env[key]) {
      continue
    }

    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

loadDotEnv()

const RUN_LIVE_AI_TESTS = process.env.RUN_LIVE_AI_TESTS === "true"
const API_BASE_URL = process.env.TEST_API_BASE_URL ?? "http://127.0.0.1:4000"
const TEST_EMAIL = process.env.TEST_ADMIN_EMAIL ?? "admin@kazindustries.dev"
const TEST_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? "kazadmin123"

const liveDescribe = RUN_LIVE_AI_TESTS ? describe : describe.skip

type LoginResponse = {
  token: string
}

async function login() {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    signal: AbortSignal.timeout(20_000)
  })

  expect(response.status).toBe(200)
  return response.json() as Promise<LoginResponse>
}

async function authedGet<T>(path: string, token: string) {
  console.info("[live-ai] GET", path)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(90_000)
  })

  expect(response.status).toBe(200)
  return response.json() as Promise<T>
}

liveDescribe("live AI smoke", () => {
  it("authenticates and exposes AI-related endpoints", async () => {
    const { token } = await login()

    const dashboard = await authedGet<{
      priorityQueue: Array<{ vehicleId: string }>
    }>("/api/v1/dashboard", token)

    expect(dashboard.priorityQueue.length).toBeGreaterThan(0)

    const vehicleId = dashboard.priorityQueue[0].vehicleId

    const priority = await authedGet<{
      breakdown: { aiAssessment?: unknown | null }
    }>(`/api/v1/orchestration/vehicles/${vehicleId}/priority`, token)

    const depots = await authedGet<Array<{
      aiAssessment?: unknown | null
    }>>(`/api/v1/orchestration/vehicles/${vehicleId}/depot-match`, token)

    const dispatchPlan = await authedGet<{
