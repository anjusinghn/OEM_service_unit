import type { Job } from "bullmq"

import { enqueueJob, faultRepository, queueNames, type QueuePayloadMap } from "@kaz/db"

export const processFaultEvent = async (job: Job<QueuePayloadMap[typeof queueNames.faultEvents]>) => {
  const { vehicleId, kind, fault, timestamp } = job.data

  if (kind === "clear") {
    await faultRepository.resolveAllForVehicle(vehicleId, new Date(timestamp))
  } else if (fault) {
    await faultRepository.upsertActiveFault({
      id: fault.id,
      vehicleId: fault.vehicleId,
      dtcCode: fault.dtcCode,
      subsystem: fault.subsystem,
      severity: fault.severity,
      title: fault.title,
      description: fault.description,
      occurredAt: new Date(fault.occurredAt),
      occurrences: fault.occurrences,
      isActive: true
    })
  }

  await enqueueJob(queueNames.healthRecompute, {
    vehicleId,
    cause: "fault",
    timestamp
  })

  return { vehicleId, kind }
}
