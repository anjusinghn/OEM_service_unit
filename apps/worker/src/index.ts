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
