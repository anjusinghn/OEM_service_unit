import { Queue, type JobsOptions, type QueueOptions } from "bullmq"
import type { VehicleFault, VehicleSignalSnapshot } from "@kaz/shared"

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379"
const redisUrl = new URL(REDIS_URL)

export const dashboardChannel = "channel:dashboard"

export const queueNames = {
  telemetryIngest: "telemetry-ingest",
  faultEvents: "fault-events",
  healthRecompute: "health-recompute",
  priorityRerank: "priority-rerank",
  aiReasoning: "ai-reasoning",
  depotMatch: "depot-match",
  techMatch: "tech-match",
  notifications: "notifications"
} as const

export const queueConcurrency = {
  [queueNames.telemetryIngest]: 10,
  [queueNames.faultEvents]: 5,
  [queueNames.healthRecompute]: 5,
  [queueNames.priorityRerank]: 2,
  [queueNames.aiReasoning]: 3,
  [queueNames.depotMatch]: 3,
  [queueNames.techMatch]: 3,
  [queueNames.notifications]: 2
} as const

export type QueueName = (typeof queueNames)[keyof typeof queueNames]

export type TelemetryIngestJob = {
  vehicleId: string
  snapshot: VehicleSignalSnapshot
  timestamp: string
  source: string
}

export type FaultEventJob = {
  vehicleId: string
  kind: "upsert" | "clear"
  fault?: VehicleFault
  timestamp: string
  source: string
}

export type HealthRecomputeJob = {
  vehicleId: string
  cause: "signal" | "fault" | "manual"
  timestamp: string
}

export type PriorityRerankJob = {
  vehicleId: string
  statusChanged: boolean
  timestamp: string
}

export type AiReasoningJob = {
  decisionType: "priority" | "depot" | "technician" | "escalation"
  vehicleId?: string
  depotId?: string
  weakestSubsystem?: string
  timestamp: string
}

export type DepotMatchJob = {
  vehicleId: string
  weakestSubsystem: string
  timestamp: string
}

export type TechMatchJob = {
  vehicleId: string
  depotId: string
  weakestSubsystem: string
  timestamp: string
}

export type NotificationJob = {
  type: "health_update" | "priority_change" | "fault_event" | "service_update" | "dispatch_event"
  vehicleId?: string
  serviceRequestId?: string
  payload: Record<string, unknown>
  timestamp: string
}

export type QueuePayloadMap = {
  [queueNames.telemetryIngest]: TelemetryIngestJob
  [queueNames.faultEvents]: FaultEventJob
  [queueNames.healthRecompute]: HealthRecomputeJob
  [queueNames.priorityRerank]: PriorityRerankJob
  [queueNames.aiReasoning]: AiReasoningJob
  [queueNames.depotMatch]: DepotMatchJob
  [queueNames.techMatch]: TechMatchJob
  [queueNames.notifications]: NotificationJob
}

const queueDefaultJobOptions: JobsOptions = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 100,
  backoff: {
    type: "exponential",
    delay: 1000
  }
}

const queueOptions: QueueOptions = {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  },
  defaultJobOptions: queueDefaultJobOptions
}

export const telemetryIngestQueue = new Queue<QueuePayloadMap[typeof queueNames.telemetryIngest], void, string>(queueNames.telemetryIngest, queueOptions)
export const faultEventsQueue = new Queue<QueuePayloadMap[typeof queueNames.faultEvents], void, string>(queueNames.faultEvents, queueOptions)
export const healthRecomputeQueue = new Queue<QueuePayloadMap[typeof queueNames.healthRecompute], void, string>(queueNames.healthRecompute, queueOptions)
export const priorityRerankQueue = new Queue<QueuePayloadMap[typeof queueNames.priorityRerank], void, string>(queueNames.priorityRerank, queueOptions)
export const aiReasoningQueue = new Queue<QueuePayloadMap[typeof queueNames.aiReasoning], void, string>(queueNames.aiReasoning, queueOptions)
export const depotMatchQueue = new Queue<QueuePayloadMap[typeof queueNames.depotMatch], void, string>(queueNames.depotMatch, queueOptions)
export const techMatchQueue = new Queue<QueuePayloadMap[typeof queueNames.techMatch], void, string>(queueNames.techMatch, queueOptions)
export const notificationsQueue = new Queue<QueuePayloadMap[typeof queueNames.notifications], void, string>(queueNames.notifications, queueOptions)

export const queues: { [K in QueueName]: Queue<QueuePayloadMap[K], void, string> } = {
  [queueNames.telemetryIngest]: telemetryIngestQueue,
  [queueNames.faultEvents]: faultEventsQueue,
  [queueNames.healthRecompute]: healthRecomputeQueue,
  [queueNames.priorityRerank]: priorityRerankQueue,
  [queueNames.aiReasoning]: aiReasoningQueue,
  [queueNames.depotMatch]: depotMatchQueue,
  [queueNames.techMatch]: techMatchQueue,
  [queueNames.notifications]: notificationsQueue
} as const

export const getQueue = <TName extends QueueName>(name: TName): Queue<QueuePayloadMap[TName], void, string> => queues[name]

export const enqueueJob = <TName extends QueueName>(
  queueName: TName,
  payload: QueuePayloadMap[TName],
  options?: JobsOptions
) => {
  switch (queueName) {
    case queueNames.telemetryIngest:
      return telemetryIngestQueue.add("job", payload as QueuePayloadMap[typeof queueNames.telemetryIngest], options)
    case queueNames.faultEvents:
      return faultEventsQueue.add("job", payload as QueuePayloadMap[typeof queueNames.faultEvents], options)
    case queueNames.healthRecompute:
      return healthRecomputeQueue.add("job", payload as QueuePayloadMap[typeof queueNames.healthRecompute], options)
    case queueNames.priorityRerank:
      return priorityRerankQueue.add("job", payload as QueuePayloadMap[typeof queueNames.priorityRerank], options)
    case queueNames.aiReasoning:
      return aiReasoningQueue.add("job", payload as QueuePayloadMap[typeof queueNames.aiReasoning], options)
    case queueNames.depotMatch:
      return depotMatchQueue.add("job", payload as QueuePayloadMap[typeof queueNames.depotMatch], options)
    case queueNames.techMatch:
      return techMatchQueue.add("job", payload as QueuePayloadMap[typeof queueNames.techMatch], options)
    case queueNames.notifications:
      return notificationsQueue.add("job", payload as QueuePayloadMap[typeof queueNames.notifications], options)
  }
}

export const closeQueues = async (): Promise<void> => {
  await Promise.all([
    telemetryIngestQueue.close(),
    faultEventsQueue.close(),
    healthRecomputeQueue.close(),
    priorityRerankQueue.close(),
    aiReasoningQueue.close(),
    depotMatchQueue.close(),
    techMatchQueue.close(),
    notificationsQueue.close()
  ])
}
