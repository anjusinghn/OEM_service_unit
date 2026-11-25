import { CHENNAI_ORG_ID } from "@kaz/shared"

import type { TelemetryIngestJob } from "./queues"
import { prisma, type Prisma } from "./schema"

export async function lockChennaiVehicle(tx: Prisma.TransactionClient, vehicleId: string) {
  const matched = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM vehicles
    WHERE id = ${vehicleId} AND organization_id = ${CHENNAI_ORG_ID}
    FOR UPDATE
  `
  return matched.length > 0
}

export async function ingestChennaiTelemetry({ vehicleId, snapshot, chennai }: TelemetryIngestJob) {
  if (!chennai || snapshot.vehicleId !== vehicleId) return false
  const timestamp = new Date(snapshot.timestamp)
  return prisma.$transaction(async (tx) => {
    if (!await lockChennaiVehicle(tx, vehicleId)) return false
    const latest = await tx.vehicleSignal.findFirst({ where: { vehicleId }, orderBy: { timestamp: "desc" } })
    if (latest && latest.timestamp >= timestamp) return false

    const coolingRepair = await tx.serviceRequest.findFirst({
      where: { vehicleId, weakestSubsystem: "cooling", completedAt: { not: null } },
      select: { id: true }
    })
    if (coolingRepair && chennai.fault) return false

    await tx.vehicleSignal.create({ data: { ...snapshot, mileage: Math.max(snapshot.mileage, latest?.mileage ?? 0), timestamp } })
    await tx.vehicle.update({ where: { id: vehicleId }, data: {
      latitude: chennai.coordinates.lat, longitude: chennai.coordinates.lng
    } })
    const fault = chennai.fault
    if (fault && fault.vehicleId === vehicleId) {
      await tx.vehicleFault.upsert({
        where: { id: fault.id },
        create: { ...fault, occurredAt: new Date(fault.occurredAt), isActive: true },
        update: { severity: fault.severity }
      })
    }
    return true
  })
}
