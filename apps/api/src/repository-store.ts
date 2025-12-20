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
})

const mapTechnician = (technician: Awaited<ReturnType<typeof technicianRepository.findAll>>[number]): Technician => ({
  id: technician.id,
  name: technician.name,
  depotId: technician.depotId,
  certifications: toSubsystemArray(technician.certifications),
  currentLoad: technician.currentLoad,
  maxLoad: technician.maxLoad,
  firstTimeFixRate: technician.firstTimeFixRate
})

const mapPart = (part: Awaited<ReturnType<typeof partsRepository.getCatalog>>[number]): Part => ({
  partNumber: part.partNumber,
  name: part.name,
  subsystem: isSubsystemKey(part.subsystem) ? part.subsystem : "engine",
  leadDays: part.leadDays,
  price: part.price
})

const mapInventory = (item: Awaited<ReturnType<typeof partsRepository.getInventory>>[number]): InventoryItem => ({
  depotId: item.depotId,
  partNumber: item.partNumber,
  quantity: item.quantity,
  reorderPoint: item.reorderPoint
})

const mapFault = (fault: Awaited<ReturnType<typeof faultRepository.findByVehicle>>[number]): VehicleFault => ({
  id: fault.id,
  vehicleId: fault.vehicleId,
  dtcCode: fault.dtcCode,
  subsystem: isSubsystemKey(fault.subsystem) ? fault.subsystem : "engine",
  severity: fault.severity as VehicleFault["severity"],
  title: fault.title,
  description: fault.description,
  occurredAt: fault.occurredAt.toISOString(),
  occurrences: fault.occurrences
})

const mapServiceHistory = (record: Awaited<ReturnType<typeof serviceHistoryRepository.findRecent>>[number]): ServiceHistoryRecord => ({
  id: record.id,
  vehicleId: record.vehicleId,
  depotId: record.depotId,
  technicianId: record.technicianId,
  subsystem: isSubsystemKey(record.subsystem) ? record.subsystem : "engine",
  outcome: record.outcome,
  resolvedAt: record.resolvedAt.toISOString(),
  firstTimeFix: record.firstTimeFix
})

const mapServiceRequest = (request: Awaited<ReturnType<typeof serviceRequestRepository.findAll>>[number]): ServiceRequest => ({
  id: request.id,
  vehicleId: request.vehicleId,
  priorityScore: request.priorityScore,
  weakestSubsystem: isSubsystemKey(request.weakestSubsystem) ? request.weakestSubsystem : "engine",
  depotId: request.depotId,
  technicianId: request.technicianId,
  requiredPartNumbers: toStringArray(request.requiredPartNumbers),
  status: request.status as ServiceRequestStatus,
  createdAt: request.createdAt.toISOString(),
  scheduledFor: request.scheduledFor?.toISOString() ?? null,
  timeline: request.timeline.map((event) => ({
    status: event.status as ServiceRequestStatus,
    at: event.at.toISOString(),
    note: event.note
  }))
})

type LatestSignalRow = {
  vehicleId: string
  timestamp: Date
  coolantTemp: number
  oilPressure: number
  batteryVoltage: number
  turboBoost: number
  brakeWear: number
  exhaustTemp: number
  fuelLevel: number
  speed: number
  mileage: number
}

const loadLatestSignals = async (): Promise<Record<string, VehicleSignalSnapshot>> => {
  const rows = await prisma.$queryRaw<LatestSignalRow[]>`
    SELECT DISTINCT ON (vehicle_id)
      vehicle_id AS "vehicleId",
      timestamp,
      coolant_temp AS "coolantTemp",
      oil_pressure AS "oilPressure",
      battery_voltage AS "batteryVoltage",
      turbo_boost AS "turboBoost",
      brake_wear AS "brakeWear",
      exhaust_temp AS "exhaustTemp",
      fuel_level AS "fuelLevel",
      speed,
      mileage
    FROM vehicle_signals
    ORDER BY vehicle_id, timestamp DESC
  `

  return Object.fromEntries(
    rows.map((row) => [
      row.vehicleId,
      {
        vehicleId: row.vehicleId,
        timestamp: row.timestamp.toISOString(),
        coolantTemp: row.coolantTemp,
        oilPressure: row.oilPressure,
        batteryVoltage: row.batteryVoltage,
        turboBoost: row.turboBoost,
        brakeWear: row.brakeWear,
        exhaustTemp: row.exhaustTemp,
        fuelLevel: row.fuelLevel,
        speed: row.speed,
        mileage: row.mileage
      }
    ])
  )
}

type ForensicsOverlay = {
  patternStatuses: Map<string, PatternStatus>
  investigations: Investigation[]
}

class RepositoryStore {
  private readonly emitter = new EventEmitter()
  private readonly timer: NodeJS.Timeout
  private readonly overlay: ForensicsOverlay = {
    patternStatuses: new Map(),
    investigations: []
  }

  constructor() {
    this.timer = setInterval(() => {
      this.emitter.emit("change")
    }, 12_000)
  }

  dispose() {
    clearInterval(this.timer)
  }

