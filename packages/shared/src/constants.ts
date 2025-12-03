import type {
  CohortDimension,
  ContainmentType,
  InvestigationStatus,
  PatternStatus,
  ServiceRequestStatus,
  SubsystemKey
} from "./types"

export const SUBSYSTEMS: SubsystemKey[] = [
  "engine",
  "cooling",
  "brakes",
  "electrical",
  "exhaust",
  "turbo",
  "fuel",
  "transmission"
]

export const SERVICE_FLOW: ServiceRequestStatus[] = [
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

export const INVESTIGATION_FLOW: InvestigationStatus[] = [
  "PATTERN_DETECTED",
  "INVESTIGATION_OPENED",
  "EVIDENCE_COLLECTED",
  "ROOT_CAUSE_IDENTIFIED",
  "CONTAINMENT_RECOMMENDED",
  "ACTION_TAKEN",
  "VERIFIED"
]

export const PATTERN_STATUSES: PatternStatus[] = [
  "DETECTED",
  "UNDER_REVIEW",
  "CONFIRMED",
  "ACTIVE",
  "RETIRED"
]

export const CONTAINMENT_TYPES: ContainmentType[] = [
