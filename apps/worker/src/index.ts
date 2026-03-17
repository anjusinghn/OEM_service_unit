import { Worker, type Job } from "bullmq"

import { aiReasoningQueue, closeQueues, enqueueJob, queueConcurrency, queueNames, rewardComputeQueue, type QueuePayloadMap } from "@kaz/db"

import { processAiReasoning } from "./processors/ai-reasoning.js"
import { processDepotMatch } from "./processors/depot-match.js"
import { processFaultEvent } from "./processors/fault-events.js"
import { processHealthRecompute } from "./processors/health-recompute.js"
import { processNotification } from "./processors/notifications.js"
import { processPriorityRerank } from "./processors/priority-rerank.js"
import { processRewardCompute } from "./processors/reward-compute.js"
import { processSignalIngest } from "./processors/signal-ingest.js"
import { processTechMatch } from "./processors/tech-match.js"

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379"
const redisUrl = new URL(REDIS_URL)

const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
}

const workers = [
  new Worker<QueuePayloadMap[typeof queueNames.telemetryIngest]>(queueNames.telemetryIngest, processSignalIngest, {
    connection,
    concurrency: queueConcurrency[queueNames.telemetryIngest]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.faultEvents]>(queueNames.faultEvents, processFaultEvent, {
    connection,
    concurrency: queueConcurrency[queueNames.faultEvents]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.healthRecompute]>(queueNames.healthRecompute, processHealthRecompute, {
    connection,
    concurrency: queueConcurrency[queueNames.healthRecompute]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.priorityRerank]>(queueNames.priorityRerank, processPriorityRerank, {
    connection,
    concurrency: queueConcurrency[queueNames.priorityRerank]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.aiReasoning]>(queueNames.aiReasoning, processAiReasoning, {
    connection,
    concurrency: queueConcurrency[queueNames.aiReasoning]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.rewardCompute]>(queueNames.rewardCompute, processRewardCompute, {
    connection,
    concurrency: queueConcurrency[queueNames.rewardCompute]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.depotMatch]>(queueNames.depotMatch, processDepotMatch, {
    connection,
    concurrency: queueConcurrency[queueNames.depotMatch]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.techMatch]>(queueNames.techMatch, processTechMatch, {
    connection,
    concurrency: queueConcurrency[queueNames.techMatch]
  }),
  new Worker<QueuePayloadMap[typeof queueNames.notifications]>(queueNames.notifications, processNotification, {
    connection,
    concurrency: queueConcurrency[queueNames.notifications]
  })
]

const ESCALATION_SCAN_INTERVAL_MS = Number(process.env.AI_ESCALATION_INTERVAL_MS ?? 300000)
const escalationTimer = setInterval(() => {
  void enqueueJob(queueNames.aiReasoning, {
    decisionType: "escalation",
    timestamp: new Date().toISOString()
  })
}, ESCALATION_SCAN_INTERVAL_MS)

for (const worker of workers) {
  worker.on("completed", (job: Job<unknown>) => {
    console.log(`[worker] completed queue=${worker.name} job=${job.id}`)
  })

  worker.on("failed", (job: Job<unknown> | undefined, error: Error) => {
    console.error(`[worker] failed queue=${worker.name} job=${job?.id ?? "unknown"}`, error)
  })
}

const shutdown = async (signal: string) => {
  console.log(`[worker] shutting down on ${signal}`)
  clearInterval(escalationTimer)
  await Promise.all(workers.map((worker) => worker.close()))
  await closeQueues()
  process.exit(0)
}

console.log("[worker] BullMQ worker cluster ready")
console.log(`[worker] queues=${workers.map((worker) => worker.name).join(",")}`)
console.log(`[worker] escalationIntervalMs=${ESCALATION_SCAN_INTERVAL_MS}`)

process.on("SIGINT", () => {
  void shutdown("SIGINT")
})

process.on("SIGTERM", () => {
  void shutdown("SIGTERM")
})
