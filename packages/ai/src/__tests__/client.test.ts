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
