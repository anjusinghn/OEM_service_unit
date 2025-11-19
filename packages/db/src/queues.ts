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
  rewardCompute: "reward-compute",
  depotMatch: "depot-match",
  notifications: "notifications"
} as const

export const queueConcurrency = {
  [queueNames.telemetryIngest]: 10,
  [queueNames.faultEvents]: 5,
  [queueNames.healthRecompute]: 5,
  [queueNames.priorityRerank]: 2,
  [queueNames.aiReasoning]: 3,
  [queueNames.rewardCompute]: 2,
  [queueNames.depotMatch]: 3,
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
  decisionType: "priority" | "depot" | "escalation"
  vehicleId?: string
  timestamp: string
}

export type RewardComputeJob = {
  serviceRequestId: string
  vehicleId: string
  timestamp: string
  depotRating?: number | null
  technicianRating?: number | null
  priorityRating?: number | null
}

export type DepotMatchJob = {
  vehicleId: string
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
