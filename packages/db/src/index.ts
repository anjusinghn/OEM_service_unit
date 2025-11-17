// ─────────────────────────────────────────────────────────────
// @kaz/db — Public API
// Re-exports the Prisma client singleton and generated types.
// ─────────────────────────────────────────────────────────────

export { prisma, PrismaClient } from "./schema";
export type { Prisma } from "./schema";
export {
  aiReasoningQueue,
  closeQueues,
  dashboardChannel,
  depotMatchQueue,
  enqueueJob,
  faultEventsQueue,
  getQueue,
  healthRecomputeQueue,
  notificationsQueue,
  priorityRerankQueue,
  rewardComputeQueue,
  queueConcurrency,
  queueNames,
  queues,
  telemetryIngestQueue
} from "./queues";
export { resetAndSeed, resetDatabase, seedDatabase } from "./seed";

export {
  cacheDelete,
  cacheGetJson,
  cacheSetJson,
  disconnectRedis,
  publish,
  redis,
  redisPub,
  redisSub,
  subscribe,
} from "./redis";
export type { CacheSetOptions, RedisMessageHandler } from "./redis";

export {
  apiKeyRepository,
  cacheRepository,
  depotRepository,
