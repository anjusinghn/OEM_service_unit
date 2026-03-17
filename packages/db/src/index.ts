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
  techMatchQueue,
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
  cacheRepository,
  depotRepository,
  faultRepository,
  healthRepository,
  partsRepository,
  priorityRepository,
  rewardSignalRepository,
  serviceHistoryRepository,
  serviceRequestRepository,
  signalRepository,
  technicianRepository,
  vehicleRepository
} from "./repositories"

export type {
  AssignDepotAndTechnicianInput,
  CompleteServiceRequestInput,
  CreateServiceRequestInput,
  HealthSnapshotCreateInput,
  HealthTrendOptions,
  OutcomeStatsFilter,
  PriorityEntryUpsertInput,
  PriorityQueueOptions,
  PrioritySnapshotCreateInput,
  ReservePartInput,
  ServiceHistoryOutcomeStats,
  SignalRangeOptions,
  SignalSnapshotCreateInput,
  UpdateServiceStatusInput,
  UpsertActiveFaultInput
} from "./repositories"
export type {
  AiReasoningJob,
  DepotMatchJob,
  FaultEventJob,
  HealthRecomputeJob,
  NotificationJob,
  PriorityRerankJob,
  RewardComputeJob,
  QueueName,
  QueuePayloadMap,
  TechMatchJob,
  TelemetryIngestJob
} from "./queues"
