import type { Job } from "bullmq"

import { cacheRepository, queueNames, type QueuePayloadMap } from "@kaz/db"
import { recommendDepots } from "@kaz/orchestration"

import { loadOperationalState } from "../state-loader.js"

export const processDepotMatch = async (job: Job<QueuePayloadMap[typeof queueNames.depotMatch]>) => {
  const { vehicleId } = job.data
  const { state, healthByVehicle } = await loadOperationalState()
  const vehicle = state.vehicles.find((item) => item.id === vehicleId)
  const health = healthByVehicle[vehicleId]
  if (!vehicle || !health) {
    return { vehicleId, skipped: true }
  }

  const recommendations = recommendDepots(vehicle, state, health.weakestSubsystem)
  await cacheRepository.setVehicleDepotMatch(vehicleId, recommendations)
  return { vehicleId, recommendations: recommendations.length }
}
