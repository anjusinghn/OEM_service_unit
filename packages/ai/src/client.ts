import { ChatOpenAI } from "@langchain/openai"

const AI_ENABLED = process.env.AI_ENABLED === "true"

export const aiConfig = {
  enabled: AI_ENABLED,
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  model: process.env.OPENROUTER_MODEL ?? "z-ai/glm-4.5-air:free",
  cacheTtlSeconds: Number(process.env.AI_CACHE_TTL_SECONDS ?? 300),
  timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000),
  maxRetries: Number(process.env.AI_MAX_RETRIES ?? 3),
  maxToolSteps: Number(process.env.AI_MAX_TOOL_STEPS ?? 8)
} as const

export const canUseAi = () => aiConfig.enabled && aiConfig.apiKey.length > 0

export const createOpenRouterClient = () =>
  new ChatOpenAI({
    apiKey: aiConfig.apiKey,
    configuration: {
      baseURL: aiConfig.baseUrl
    },
    model: aiConfig.model,
    temperature: 0.6,
    timeout: aiConfig.timeoutMs,
    maxRetries: aiConfig.maxRetries
  })
