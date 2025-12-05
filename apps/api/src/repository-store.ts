import { EventEmitter } from "node:events"

import { buildFewShotExamples, buildLearnedPatterns, buildWeightAdjustmentProposals, renderFewShotExamples, runDispatchReasoning } from "@kaz/ai"
import {
  type Prisma,
  cacheRepository,
  dashboardChannel,
  depotRepository,
  enqueueJob,
  faultRepository,
  partsRepository,
  prisma,
  publish,
  queueNames,
  rewardSignalRepository,
  resetAndSeed,
  serviceHistoryRepository,
  serviceRequestRepository,
  signalRepository,
  technicianRepository,
  vehicleRepository,
} from "@kaz/db"
import {
  advanceInvestigation as advanceInvestigationEngine,
  buildEvidencePackage as buildEvidencePackageEngine,
  buildForensicsSnapshot,
  compareCohort,
  createInvestigation as createInvestigationEngine
} from "@kaz/forensics"
import { buildSnapshot, recommendDepots } from "@kaz/orchestration"
import { computeHealthScore, dedupeAlerts } from "@kaz/signal-trust"
import {
  nowIso,
  type Alert,
  type DashboardSnapshot,
  type DemoState,
  type Depot,
  type ForensicsSnapshot,
  type HealthScore,
  type IntelligenceSnapshot,
  type Investigation,
  type InvestigationStatus,
  type InventoryItem,
  type LivePulse,
  type Part,
  type PatternStatus,
  type ServiceCompletionInput,
  type DecisionReviewItem,
  type ServiceHistoryRecord,
  type ServiceRequest,
  type ServiceRequestStatus,
  type SubsystemKey,
  type SupplierInfo,
  type Technician,
  type Vehicle,
  type VehicleFault,
  type VehicleSignalSnapshot
} from "@kaz/shared"

type DashboardPayload = DashboardSnapshot & {
  vehicles: Array<Vehicle & {
    signal: VehicleSignalSnapshot
    health: HealthScore
    faults: VehicleFault[]
    priority: DashboardSnapshot["priorityQueue"][number] | null
    depotRecommendations: DashboardSnapshot["depotRecommendations"][string]
    currentRequest: ServiceRequest | null
  }>
  depots: Depot[]
  technicians: Technician[]
  serviceRequests: ServiceRequest[]
  forensics: ForensicsSnapshot
  generatedAt: string
}

type LatestAiDecisionRow = {
  vehicleId: string
  decisionType: string
  aiOutput: Prisma.JsonValue | null
}

const toJsonValue = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue

const toAiDecisionData = (value: Prisma.JsonValue | null | undefined) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null

type ServiceActionResult = {
  request: ServiceRequest
  livePulse: LivePulse
}

const isString = (value: unknown): value is string => typeof value === "string"

const isSubsystemKey = (value: string): value is SubsystemKey =>
  ["engine", "cooling", "brakes", "electrical", "exhaust", "turbo", "fuel", "transmission"].includes(value)

const toStringArray = (value: Prisma.JsonValue | null | undefined): string[] =>
  Array.isArray(value) ? value.filter(isString) : []

const toSubsystemArray = (value: Prisma.JsonValue | null | undefined): SubsystemKey[] =>
  toStringArray(value).filter(isSubsystemKey)

const defaultSignalSnapshot = (vehicleId: string): VehicleSignalSnapshot => ({
  vehicleId,
  timestamp: new Date(0).toISOString(),
  coolantTemp: 87,
  oilPressure: 48,
  batteryVoltage: 13.4,
  turboBoost: 1.7,
  brakeWear: 32,
  exhaustTemp: 365,
  fuelLevel: 62,
  speed: 56,
  mileage: 40000
})

const mapVehicle = (vehicle: Awaited<ReturnType<typeof vehicleRepository.findAll>>[number]): Vehicle => ({
  id: vehicle.id,
  vin: vehicle.vin,
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year,
  region: vehicle.region,
  routeName: vehicle.routeName,
  buildBatch: vehicle.buildBatch,
  softwareVersion: vehicle.softwareVersion,
  cargoPriority: vehicle.cargoPriority,
  routeCriticality: vehicle.routeCriticality,
  downtimeCostPerHour: vehicle.downtimeCostPerHour,
  nextStopHours: vehicle.nextStopHours,
  coordinates: { lat: vehicle.latitude, lng: vehicle.longitude },
  depotAffinityId: vehicle.depotAffinityId ?? ""
})

const mapDepot = (depot: Awaited<ReturnType<typeof depotRepository.findAll>>[number]): Depot => ({
  id: depot.id,
  name: depot.name,
  city: depot.city,
  region: depot.region,
  coordinates: { lat: depot.latitude, lng: depot.longitude },
  specialties: toSubsystemArray(depot.specialties),
  totalBays: depot.totalBays,
  occupiedBays: depot.occupiedBays
