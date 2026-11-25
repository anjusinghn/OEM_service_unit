import {
  CHENNAI_COOLING_DTC, CHENNAI_COOLING_PART, CHENNAI_FAULT_VEHICLE, CHENNAI_ORG_ID, SERVICE_FLOW,
  type DepotRecommendation, type ServiceCompletionInput, type ServiceRequestStatus, type SubsystemKey
} from "@kaz/shared"

import { lockChennaiVehicle } from "./chennai-telemetry"
import { serviceRequestRepository } from "./repositories/service-request-repository"
import { prisma, type Prisma } from "./schema"

async function lockWorkshop(tx: Prisma.TransactionClient, depotId: string) {
  const matched = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM depots WHERE id = ${depotId} AND organization_id = ${CHENNAI_ORG_ID} FOR UPDATE
  `
  return matched.length > 0
}

export async function dispatchChennaiTruck(input: {
  vehicleId: string; priorityScore: number; subsystem: SubsystemKey; recommendation: DepotRecommendation
}) {
  const { vehicleId, priorityScore, subsystem, recommendation } = input
  const { depotId, schedule, requiredParts } = recommendation
  if (!schedule) return null
  return prisma.$transaction(async (tx) => {
    if (!await lockChennaiVehicle(tx, vehicleId)) return null
    const existing = await tx.serviceRequest.findFirst({ where: { vehicleId, status: { not: "CLOSED" } } })
    if (existing) return serviceRequestRepository.findById(existing.id, tx)

    const fault = await tx.vehicleFault.findFirst({ where: { vehicleId, subsystem, isActive: true } })
    if (!fault || !await lockWorkshop(tx, depotId)) return null
    const [depot, technician, inventory] = await Promise.all([
      tx.depot.findUniqueOrThrow({ where: { id: depotId } }),
      tx.technician.findUnique({ where: { id: schedule.technicianId } }),
      tx.inventoryItem.findMany({ where: { depotId } })
    ])
    if (depot.occupiedBays >= depot.totalBays || !Array.isArray(depot.specialties) || !depot.specialties.includes(subsystem)) return null
    if (!technician || technician.depotId !== depotId || technician.currentLoad >= technician.maxLoad ||
        !Array.isArray(technician.certifications) || !technician.certifications.includes(subsystem)) return null
    const missing = requiredParts.filter(({ partNumber }) =>
      !inventory.some((item) => item.partNumber === partNumber && item.quantity > 0))
    if (missing.some(({ partNumber }) => depotId !== "chennai-poonamallee" || partNumber !== CHENNAI_COOLING_PART)) return null
    if (missing.length && !schedule.partsReadyMinutes) return null

    await tx.depot.update({ where: { id: depotId }, data: { occupiedBays: { increment: 1 } } })
    await tx.technician.update({ where: { id: technician.id }, data: { currentLoad: { increment: 1 } } })
    return serviceRequestRepository.create({
      vehicleId, priorityScore, weakestSubsystem: subsystem, depotId, technicianId: technician.id,
      requiredPartNumbers: requiredParts.map((part) => part.partNumber), initialStatus: "DEPOT_ASSIGNED",
      scheduledFor: new Date(Date.now() + Math.max(schedule.travelMinutes, schedule.partsReadyMinutes) * 60_000)
    }, tx)
  })
}

export async function advanceChennaiRepair(requestId: string, target?: ServiceRequestStatus, completion?: ServiceCompletionInput) {
  return prisma.$transaction(async (tx) => {
    const base = await tx.serviceRequest.findUnique({ where: { id: requestId }, select: { vehicleId: true } })
    if (!base || !await lockChennaiVehicle(tx, base.vehicleId)) return null
    const request = await serviceRequestRepository.findById(requestId, tx)
    if (!request) return null
    if (target === request.status || (target === "COMPLETED" && request.completedAt)) return { request, changed: false }

    const next = SERVICE_FLOW[SERVICE_FLOW.indexOf(request.status) + 1]
    if (!next || (target && target !== next)) return null
    if (next !== "COMPLETED") {
      return { request: await serviceRequestRepository.updateStatus({ requestId, targetStatus: next }, tx), changed: true }
    }

    const { depotId, technicianId } = request
    if (!depotId || !technicianId || !await lockWorkshop(tx, depotId)) return null
    const finished = await serviceRequestRepository.updateStatus({ requestId, targetStatus: "COMPLETED" }, tx)
    const completedAt = finished.completedAt!
    const data = completion ?? {}

    await tx.vehicleFault.updateMany({
      where: {
        vehicleId: request.vehicleId, subsystem: request.weakestSubsystem, isActive: true,
        ...(request.vehicleId === CHENNAI_FAULT_VEHICLE && request.weakestSubsystem === "cooling" ? { dtcCode: CHENNAI_COOLING_DTC } : {})
      },
      data: { isActive: false, resolvedAt: completedAt }
    })
    await tx.depot.updateMany({ where: { id: depotId, occupiedBays: { gt: 0 } }, data: { occupiedBays: { decrement: 1 } } })
    await tx.technician.updateMany({ where: { id: technicianId, currentLoad: { gt: 0 } }, data: { currentLoad: { decrement: 1 } } })
    await tx.serviceHistory.create({ data: {
      vehicleId: request.vehicleId, depotId, technicianId, subsystem: request.weakestSubsystem,
      outcome: "Simulated service completed", resolvedAt: completedAt, firstTimeFix: data.firstTimeFix ?? true,
      actualFault: data.actualFault ?? null, partsUsed: data.partsUsed ?? [], repairDuration: data.repairDuration ?? null,
      diagnosisCorrect: data.diagnosisCorrect ?? null, technicianNotes: data.technicianNotes ?? null
    } })
    return { request: finished, changed: true }
  })
}
