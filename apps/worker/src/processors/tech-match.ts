import type { Job } from "bullmq"

import { cacheRepository, queueNames, type QueuePayloadMap } from "@kaz/db"
import { recommendTechnicians } from "@kaz/orchestration"

import { loadOperationalState } from "../state-loader.js"

export const processTechMatch = async (job: Job<QueuePayloadMap[typeof queueNames.techMatch]>) => {
  const { vehicleId, depotId, weakestSubsystem } = job.data
  const { state } = await loadOperationalState()
  const recommendations = recommendTechnicians(state, depotId, weakestSubsystem as Parameters<typeof recommendTechnicians>[2])
  await cacheRepository.setVehicleTechMatch(vehicleId, recommendations)
  return { vehicleId, recommendations: recommendations.length }
}
