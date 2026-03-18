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
      depotId: string
      partsToStage: string[]
      urgencyLevel: string
      watchPoints: string[]
      agentTrace: string[]
      model: string | null
      latencyMs: number | null
    }>(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch-plan`, token)

    const intelligence = await authedGet<{
      bestDecisions: unknown[]
      rewardSignals: unknown[]
      learnedPatterns: unknown[]
    }>("/api/v1/intelligence", token)

    expect(typeof dispatchPlan.depotId).toBe("string")
    expect(Array.isArray(dispatchPlan.partsToStage)).toBe(true)
    expect(Array.isArray(dispatchPlan.watchPoints)).toBe(true)
    expect(Array.isArray(dispatchPlan.agentTrace)).toBe(true)
    expect(depots.length).toBeGreaterThan(0)
    expect(Array.isArray(intelligence.bestDecisions)).toBe(true)
    expect(Array.isArray(intelligence.rewardSignals)).toBe(true)
    expect(Array.isArray(intelligence.learnedPatterns)).toBe(true)

    console.info("[live-ai] priority-ai", priority.breakdown.aiAssessment ? "present" : "fallback")
    console.info("[live-ai] depot-ai", depots[0]?.aiAssessment ? "present" : "fallback")
    console.info(
      "[live-ai] dispatch",
      JSON.stringify({
        model: dispatchPlan.model,
        latencyMs: dispatchPlan.latencyMs,
        traceTail: dispatchPlan.agentTrace.at(-1)
      })
    )
    console.info(
      "[live-ai] intelligence",
      JSON.stringify({
        rewardSignals: intelligence.rewardSignals.length,
        bestDecisions: intelligence.bestDecisions.length,
        learnedPatterns: intelligence.learnedPatterns.length
      })
    )
  }, 120000)

  it("can probe OpenRouter directly with the configured model", async () => {
    const baseUrl = process.env.OPENROUTER_BASE_URL
    const apiKey = process.env.OPENROUTER_API_KEY
    const model = process.env.OPENROUTER_MODEL

    expect(baseUrl).toBeTruthy()
    expect(apiKey).toBeTruthy()
    expect(model).toBeTruthy()

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: pong" }],
        max_tokens: 64,
        temperature: 0
      }),
      signal: AbortSignal.timeout(30_000)
    })

    expect([200, 429]).toContain(response.status)

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null; reasoning?: string | null } }>
      error?: { message?: string }
    }

    if (response.status === 429) {
      console.info("[live-ai] openrouter", JSON.stringify({ status: 429, message: payload.error?.message ?? "rate limited" }))
      return
    }

    const message = payload.choices?.[0]?.message
    expect(message).toBeTruthy()
    expect(typeof message?.content === "string" || typeof message?.reasoning === "string").toBe(true)

    console.info(
      "[live-ai] openrouter",
      JSON.stringify({
        content: message?.content ?? null,
        hasReasoning: Boolean(message?.reasoning),
        reasoningPreview: message?.reasoning?.slice(0, 80) ?? null
      })
    )
  }, 60000)
})
