import type { Job } from "bullmq"

import { cacheRepository, enqueueJob, queueNames, signalRepository, type QueuePayloadMap } from "@kaz/db"

export const processSignalIngest = async (job: Job<QueuePayloadMap[typeof queueNames.telemetryIngest]>) => {
  const { snapshot } = job.data

  await signalRepository.insertSnapshot({
    vehicleId: snapshot.vehicleId,
    timestamp: new Date(snapshot.timestamp),
    coolantTemp: snapshot.coolantTemp,
    oilPressure: snapshot.oilPressure,
    batteryVoltage: snapshot.batteryVoltage,
    turboBoost: snapshot.turboBoost,
    brakeWear: snapshot.brakeWear,
    exhaustTemp: snapshot.exhaustTemp,
    fuelLevel: snapshot.fuelLevel,
    speed: snapshot.speed,
    mileage: snapshot.mileage
  })

  await cacheRepository.setVehicleSignal(snapshot.vehicleId, snapshot)
  await enqueueJob(queueNames.healthRecompute, {
    vehicleId: snapshot.vehicleId,
    cause: "signal",
    timestamp: snapshot.timestamp
  })

  return { vehicleId: snapshot.vehicleId, timestamp: snapshot.timestamp }
}
