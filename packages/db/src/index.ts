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
export { advanceChennaiRepair, dispatchChennaiTruck } from "./chennai-service";
export { ingestChennaiTelemetry, lockChennaiVehicle } from "./chennai-telemetry";

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
  faultRepository,
  healthRepository,
  partsRepository,
  priorityRepository,
  rewardSignalRepository,
  serviceHistoryRepository,
  serviceRequestRepository,
  signalRepository,
  technicianRepository,
  userRepository,
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
  TelemetryIngestJob
} from "./queues"
