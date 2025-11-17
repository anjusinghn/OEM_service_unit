import type { Job } from "bullmq"

import { cacheRepository, enqueueJob, faultRepository, healthRepository, queueNames, signalRepository, type QueuePayloadMap } from "@kaz/db"
import { computeHealthScore } from "@kaz/signal-trust"

export const processHealthRecompute = async (job: Job<QueuePayloadMap[typeof queueNames.healthRecompute]>) => {
  const { vehicleId, timestamp } = job.data
  const [signal, faults, previous] = await Promise.all([
    signalRepository.getLatest(vehicleId),
    faultRepository.findActiveByVehicle(vehicleId),
    healthRepository.getLatest(vehicleId)
  ])

  if (!signal) {
    return { vehicleId, skipped: true }
  }

  const mappedFaults = faults.map((fault) => ({
    id: fault.id,
    vehicleId: fault.vehicleId,
    dtcCode: fault.dtcCode,
    subsystem: fault.subsystem as Parameters<typeof computeHealthScore>[1][number]["subsystem"],
    severity: fault.severity as Parameters<typeof computeHealthScore>[1][number]["severity"],
    title: fault.title,
    description: fault.description,
    occurredAt: fault.occurredAt.toISOString(),
    occurrences: fault.occurrences
  }))

  const health = computeHealthScore(
    {
      vehicleId: signal.vehicleId,
      timestamp: signal.timestamp.toISOString(),
      coolantTemp: signal.coolantTemp,
      oilPressure: signal.oilPressure,
      batteryVoltage: signal.batteryVoltage,
