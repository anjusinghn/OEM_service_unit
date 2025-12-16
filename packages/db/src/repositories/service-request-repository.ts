import type { Prisma, ServiceRequestStatus } from "@prisma/client"

import { prisma } from "../schema"

const STATUS_ORDER: ServiceRequestStatus[] = [
  "DETECTED",
  "PRIORITIZED",
  "DEPOT_ASSIGNED",
  "PARTS_CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED"
]

const OPEN_STATUSES: ServiceRequestStatus[] = STATUS_ORDER.filter(
  (status) => status !== "COMPLETED" && status !== "CLOSED"
)

const statusIndex = (status: ServiceRequestStatus) => STATUS_ORDER.indexOf(status)

const getNextStatus = (current: ServiceRequestStatus): ServiceRequestStatus => {
  const index = statusIndex(current)
  return STATUS_ORDER[Math.min(index + 1, STATUS_ORDER.length - 1)]
}

const millisecondsBetween = (from?: Date | null, to?: Date | null): number | null => {
  if (!from || !to) return null
  return to.getTime() - from.getTime()
}

const buildDefaultNote = (
  status: ServiceRequestStatus,
  context: { depotId?: string | null; technicianId?: string | null } = {}
): string => {
  switch (status) {
    case "DETECTED":
      return "Signal Trust flagged the vehicle for intervention."
    case "PRIORITIZED":
      return "Vehicle ranked into priority queue."
    case "DEPOT_ASSIGNED":
      return `Assigned to depot ${context.depotId ?? "unknown"}.`
    case "PARTS_CONFIRMED":
      return `Depot ${context.depotId ?? "unknown"} confirmed part pick readiness.`
    case "TECHNICIAN_ASSIGNED":
      return `Technician ${context.technicianId ?? "unknown"} accepted the assignment.`
    case "SCHEDULED":
      return "Vehicle booked into service bay window."
    case "IN_PROGRESS":
      return "Vehicle entered active service bay."
    case "COMPLETED":
      return `Technician ${context.technicianId ?? "unassigned"} confirmed fix and cleared active faults.`
    case "CLOSED":
      return "Workflow closed after confirmation of stable telemetry."
  }
}

const fullInclude = {
  timeline: { orderBy: { at: "asc" as const } },
  slaTracking: true,
  reservations: true
} satisfies Prisma.ServiceRequestInclude

export type CreateServiceRequestInput = {
  vehicleId: string
  priorityScore: number
  weakestSubsystem: string
  depotId?: string | null
  technicianId?: string | null
  requiredPartNumbers?: string[]
  initialStatus?: ServiceRequestStatus
  scheduledFor?: Date | null
}

export type UpdateServiceStatusInput = {
  requestId: string
  targetStatus?: ServiceRequestStatus
  note?: string
}

export type AssignDepotAndTechnicianInput = {
  requestId: string
  depotId: string
  technicianId?: string | null
}

export type CompleteServiceRequestInput = {
  requestId: string
  note?: string
  actualFault?: string | null
  diagnosisCorrect?: boolean | null
  partsUsed?: string[]
  repairDuration?: number | null
  technicianNotes?: string | null
  firstTimeFix?: boolean | null
  depotRating?: number | null
  technicianRating?: number | null
  priorityRating?: number | null
}

export const serviceRequestRepository = {
  create(input: CreateServiceRequestInput) {
    const {
      vehicleId,
      priorityScore,
      weakestSubsystem,
      depotId = null,
      technicianId = null,
      requiredPartNumbers = [],
      initialStatus,
      scheduledFor = null
    } = input

    const effectiveStatus = initialStatus ?? (depotId ? "DEPOT_ASSIGNED" : "DETECTED")
    const timelineStatuses = STATUS_ORDER.slice(0, statusIndex(effectiveStatus) + 1)
    const now = new Date()

    return prisma.serviceRequest.create({
      data: {
        vehicleId,
        priorityScore,
        weakestSubsystem,
        depotId,
        technicianId,
        requiredPartNumbers,
        status: effectiveStatus,
        scheduledFor,
        timeline: {
          create: timelineStatuses.map((status) => ({
            status,
            note: buildDefaultNote(status, { depotId, technicianId })
          }))
        },
        slaTracking: {
          create: {
            detectedAt: now,
            assignedAt: depotId ? now : undefined
          }
        }
      },
      include: fullInclude
    })
  },

  findById(requestId: string) {
    return prisma.serviceRequest.findUnique({
      where: { id: requestId },
      include: fullInclude
    })
  },

  findOpen() {
    return prisma.serviceRequest.findMany({
      where: { status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: "desc" },
      include: fullInclude
    })
  },

  findAll(options: { skip?: number; take?: number } = {}) {
    return prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
      include: fullInclude
    })
  },

  findByOrganization(organizationId: string, options: { skip?: number; take?: number } = {}) {
    return prisma.serviceRequest.findMany({
      where: { vehicle: { organizationId } },
      orderBy: { createdAt: "desc" },
      skip: options.skip,
      take: options.take,
      include: fullInclude
    })
  },

  updateStatus(input: UpdateServiceStatusInput) {
    const { requestId, targetStatus, note } = input

    return prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.findUniqueOrThrow({
        where: { id: requestId },
        include: { slaTracking: true }
      })

      const newStatus = targetStatus ?? getNextStatus(request.status)
      if (newStatus === request.status) {
        return tx.serviceRequest.findUniqueOrThrow({
          where: { id: requestId },
          include: fullInclude
        })
      }

      const now = new Date()
      const updateData: Prisma.ServiceRequestUpdateInput = { status: newStatus }

      if (newStatus === "SCHEDULED" && !request.scheduledFor) {
        updateData.scheduledFor = new Date(now.getTime() + 6 * 60 * 60 * 1000)
      }

      if (newStatus === "COMPLETED" || newStatus === "CLOSED") {
        updateData.completedAt = request.completedAt ?? now
      }

      await tx.serviceTimeline.create({
        data: {
          serviceRequestId: requestId,
          status: newStatus,
          note: note ?? buildDefaultNote(newStatus, {
            depotId: request.depotId,
            technicianId: request.technicianId
          })
        }
      })

      if (request.slaTracking) {
        const slaPatch: Prisma.SlaTrackingUpdateInput = {}

        if (newStatus === "DEPOT_ASSIGNED" && !request.slaTracking.assignedAt) {
          slaPatch.assignedAt = now
          slaPatch.detectionToAssignMs = millisecondsBetween(request.slaTracking.detectedAt, now)
        }

        if (newStatus === "IN_PROGRESS" && !request.slaTracking.serviceStartedAt) {
          slaPatch.serviceStartedAt = now
          slaPatch.assignToStartMs = millisecondsBetween(request.slaTracking.assignedAt, now)
        }

        if (newStatus === "COMPLETED" && !request.slaTracking.completedAt) {
