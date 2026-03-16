import type { Job } from "bullmq"

import { cacheRepository, enqueueJob, priorityRepository, queueNames, type QueuePayloadMap } from "@kaz/db"
import { buildPriorityQueue, recommendDepots } from "@kaz/orchestration"

import { loadOperationalState } from "../state-loader.js"

export const processPriorityRerank = async (job: Job<QueuePayloadMap[typeof queueNames.priorityRerank]>) => {
  const { vehicleId, statusChanged, timestamp } = job.data
  const { state, healthByVehicle } = await loadOperationalState()
  const queue = buildPriorityQueue(state, healthByVehicle)
  const entry = queue.find((item) => item.vehicleId === vehicleId)
  if (!entry) {
    return { vehicleId, skipped: true }
  }

  await priorityRepository.upsertCurrentEntry({
    vehicleId,
    score: entry.score,
    status: entry.status,
    safetyUrgency: entry.breakdown.safetyUrgency,
    failureProximity: entry.breakdown.failureProximity,
    businessImpact: entry.breakdown.businessImpact,
    downtimeCost: entry.breakdown.downtimeCost,
    serviceWindow: entry.breakdown.serviceWindow,
    reasons: entry.breakdown.reasons,
    isOverridden: false,
    overriddenBy: null
  })

  await priorityRepository.insertSnapshot({
    vehicleId,
    timestamp: new Date(timestamp),
    score: entry.score,
    status: entry.status,
    scoreBreakdown: {
      safetyUrgency: entry.breakdown.safetyUrgency,
      failureProximity: entry.breakdown.failureProximity,
      businessImpact: entry.breakdown.businessImpact,
      downtimeCost: entry.breakdown.downtimeCost,
      serviceWindow: entry.breakdown.serviceWindow,
      reasons: [...entry.breakdown.reasons]
    },
    reasons: entry.breakdown.reasons,
    overrideBreakdown: undefined
  })

  await cacheRepository.setVehiclePriority(vehicleId, entry)

  const vehicle = state.vehicles.find((item) => item.id === vehicleId)
  const health = healthByVehicle[vehicleId]
  const topDepot = vehicle && health ? recommendDepots(vehicle, state, health.weakestSubsystem)[0] : undefined

  await enqueueJob(queueNames.depotMatch, {
    vehicleId,
    weakestSubsystem: health.weakestSubsystem,
    timestamp
  })

  if (topDepot) {
    await enqueueJob(queueNames.techMatch, {
      vehicleId,
      depotId: topDepot.depotId,
      weakestSubsystem: health.weakestSubsystem,
      timestamp
    })
  }

  await enqueueJob(queueNames.notifications, {
    type: "priority_change",
    vehicleId,
    payload: {
      score: entry.score,
      status: entry.status,
      statusChanged,
      breakdown: entry.breakdown
    },
    timestamp
  })

  return { vehicleId, score: entry.score }
}
