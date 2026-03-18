import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

describe("client", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("canUseAi returns true when AI_ENABLED=true and key present", async () => {
    process.env.AI_ENABLED = "true"
    process.env.OPENROUTER_API_KEY = "sk-test-key"
    const { canUseAi } = await import("../client")
    expect(canUseAi()).toBe(true)
  })

  it("canUseAi returns false when AI_ENABLED=false", async () => {
    process.env.AI_ENABLED = "false"
    process.env.OPENROUTER_API_KEY = "sk-test-key"
    const { canUseAi } = await import("../client")
    expect(canUseAi()).toBe(false)
  })

  it("canUseAi returns false when key is empty string", async () => {
    process.env.AI_ENABLED = "true"
    process.env.OPENROUTER_API_KEY = ""
    const { canUseAi } = await import("../client")
    expect(canUseAi()).toBe(false)
  })

  it("canUseAi returns false when key is missing", async () => {
    process.env.AI_ENABLED = "true"
    delete process.env.OPENROUTER_API_KEY
    const { canUseAi } = await import("../client")
    expect(canUseAi()).toBe(false)
  })

  it("aiConfig reads custom environment variables", async () => {
    process.env.AI_ENABLED = "true"
    process.env.OPENROUTER_API_KEY = "my-key"
    process.env.OPENROUTER_BASE_URL = "https://custom.api/v1"
    process.env.OPENROUTER_MODEL = "gpt-4"
    process.env.AI_CACHE_TTL_SECONDS = "600"
    process.env.AI_TIMEOUT_MS = "30000"
    process.env.AI_MAX_RETRIES = "5"
    process.env.AI_MAX_TOOL_STEPS = "12"
    const { aiConfig } = await import("../client")
    expect(aiConfig.enabled).toBe(true)
    expect(aiConfig.apiKey).toBe("my-key")
    expect(aiConfig.baseUrl).toBe("https://custom.api/v1")
    expect(aiConfig.model).toBe("gpt-4")
    expect(aiConfig.cacheTtlSeconds).toBe(600)
    expect(aiConfig.timeoutMs).toBe(30000)
    expect(aiConfig.maxRetries).toBe(5)
    expect(aiConfig.maxToolSteps).toBe(12)
  })

  it("aiConfig uses defaults when env vars are unset", async () => {
    delete process.env.AI_ENABLED
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_BASE_URL
    delete process.env.OPENROUTER_MODEL
    delete process.env.AI_CACHE_TTL_SECONDS
    delete process.env.AI_TIMEOUT_MS
    delete process.env.AI_MAX_RETRIES
    delete process.env.AI_MAX_TOOL_STEPS
    const { aiConfig } = await import("../client")
    expect(aiConfig.enabled).toBe(false)
    expect(aiConfig.apiKey).toBe("")
    expect(aiConfig.baseUrl).toBe("https://openrouter.ai/api/v1")
    expect(aiConfig.model).toBe("z-ai/glm-4.5-air:free")
    expect(aiConfig.cacheTtlSeconds).toBe(300)
    expect(aiConfig.timeoutMs).toBe(15000)
    expect(aiConfig.maxRetries).toBe(3)
    expect(aiConfig.maxToolSteps).toBe(8)
  })

  it("createOpenRouterClient returns an instance", async () => {
    process.env.AI_ENABLED = "true"
    process.env.OPENROUTER_API_KEY = "test-key"
    const { createOpenRouterClient } = await import("../client")
    const client = createOpenRouterClient()
    expect(client).toBeDefined()
  })
})
