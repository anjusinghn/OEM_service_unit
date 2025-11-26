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
