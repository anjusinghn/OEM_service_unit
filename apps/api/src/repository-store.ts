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

  subscribe(listener: () => void) {
    this.emitter.on("change", listener)
    return () => this.emitter.off("change", listener)
  }

  private async loadState(): Promise<DemoState> {
    const [vehicleRows, depotRows, technicianRows, partRows, inventoryRows, activeFaultRows, serviceRequestRows, serviceHistoryRows, signalMap, pulseRows, supplierRows] = await Promise.all([
      vehicleRepository.findAll(),
      depotRepository.findAll(),
      technicianRepository.findAll(),
      partsRepository.getCatalog(),
      partsRepository.getInventory(),
      prisma.vehicleFault.findMany({ where: { isActive: true }, orderBy: { occurredAt: "desc" } }),
      serviceRequestRepository.findAll(),
      prisma.serviceHistory.findMany({ orderBy: { resolvedAt: "desc" } }),
      loadLatestSignals(),
      prisma.serviceTimeline.findMany({ orderBy: { at: "desc" }, take: 24 }),
      prisma.$queryRaw<Array<{ id: string; name: string; componentTypes: Prisma.JsonValue; activeBatches: Prisma.JsonValue }>>`
        SELECT id, name, component_types AS "componentTypes", active_batches AS "activeBatches"
        FROM supplier_info
        ORDER BY name ASC
      `
    ])

    const vehicles = vehicleRows.map(mapVehicle)
    const depots = depotRows.map(mapDepot)
    const technicians = technicianRows.map(mapTechnician)
    const parts = partRows.map(mapPart)
    const inventory = inventoryRows.map(mapInventory)
    const serviceRequests = serviceRequestRows.map(mapServiceRequest)
    const serviceHistory = serviceHistoryRows.map(mapServiceHistory)

    const faultsByVehicle = Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, [] as VehicleFault[]]))
    for (const fault of activeFaultRows.map(mapFault)) {
      faultsByVehicle[fault.vehicleId] = [...(faultsByVehicle[fault.vehicleId] ?? []), fault]
    }

    const signals = Object.fromEntries(
      vehicles.map((vehicle) => [vehicle.id, signalMap[vehicle.id] ?? defaultSignalSnapshot(vehicle.id)])
    )

    const livePulse: LivePulse[] = pulseRows.map((row, index) => ({
      id: `pulse-${index + 1}`,
      kind:
        row.status === "COMPLETED"
          ? "complete"
          : row.status === "DEPOT_ASSIGNED"
            ? "dispatch"
            : row.status === "IN_PROGRESS" || row.status === "SCHEDULED"
              ? "progress"
              : "tick",
      message: row.note,
      at: row.at.toISOString()
    }))

    const suppliers: SupplierInfo[] = supplierRows.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      componentTypes: toStringArray(supplier.componentTypes),
      activeBatches: toStringArray(supplier.activeBatches)
    }))

    return {
      vehicles,
      signals,
      faults: faultsByVehicle,
      depots,
      parts,
      inventory,
      technicians,
      serviceRequests,
      serviceHistory,
      livePulse,
      suppliers,
      forensics: {
        cohorts: [],
        anomalies: [],
        patterns: [],
        investigations: [],
        supplierScorecards: [],
        heatmapData: []
      }
    }
  }

  private applyForensicsOverlay(snapshot: ForensicsSnapshot): ForensicsSnapshot {
    return {
      ...snapshot,
      patterns: snapshot.patterns.map((pattern) => ({
        ...pattern,
        status: this.overlay.patternStatuses.get(pattern.id) ?? pattern.status
      })),
      investigations: this.overlay.investigations.map((investigation) => ({ ...investigation }))
    }
  }

  private async emitDashboardRefresh(type: string, payload: Record<string, unknown> = {}) {
    const message = JSON.stringify({ type, timestamp: nowIso(), ...payload })
    await publish(dashboardChannel, message)
    this.emitter.emit("change")
  }

  private async buildPayload() {
    const state = await this.loadState()
    const latestAiRows = await prisma.$queryRaw<LatestAiDecisionRow[]>`
      SELECT DISTINCT ON (vehicle_id, decision_type)
        vehicle_id AS "vehicleId",
        decision_type AS "decisionType",
        ai_output AS "aiOutput"
      FROM ai_decision_logs
      ORDER BY vehicle_id, decision_type, created_at DESC
    `
    const aiByVehicle = Object.fromEntries(
      latestAiRows.map((row) => [`${row.vehicleId}:${row.decisionType}`, row.aiOutput])
    ) as Record<string, Prisma.JsonValue | null>
    const healthByVehicle = Object.fromEntries(
      state.vehicles.map((vehicle) => [
        vehicle.id,
        computeHealthScore(state.signals[vehicle.id], state.faults[vehicle.id] ?? [])
      ])
    ) as Record<string, HealthScore>
    const alerts: Alert[] = dedupeAlerts(state.faults)
    const baseSnapshot = buildSnapshot(state, healthByVehicle, alerts)
    const depotRecommendations = Object.fromEntries(
      state.vehicles.map((vehicle) => [
        vehicle.id,
        recommendDepots(vehicle, state, healthByVehicle[vehicle.id].weakestSubsystem)
      ])
    )
    const snapshot: DashboardSnapshot = {
      ...baseSnapshot,
      priorityQueue: baseSnapshot.priorityQueue.map((entry) => ({
        ...entry,
        breakdown: {
          ...entry.breakdown,
          aiAssessment: aiByVehicle[`${entry.vehicleId}:priority`] && typeof aiByVehicle[`${entry.vehicleId}:priority`] === "object" && !Array.isArray(aiByVehicle[`${entry.vehicleId}:priority`])
            ? (aiByVehicle[`${entry.vehicleId}:priority`] as DashboardSnapshot["priorityQueue"][number]["breakdown"]["aiAssessment"])
            : null
        }
      })),
      depotRecommendations: Object.fromEntries(
        Object.entries(depotRecommendations).map(([vehicleId, recommendations]) => [
          vehicleId,
          recommendations.map((recommendation) => {
            const aiAssessment = aiByVehicle[`${vehicleId}:depot`]
            return aiAssessment && typeof aiAssessment === "object" && !Array.isArray(aiAssessment)
              ? { ...recommendation, aiAssessment: recommendation.depotId === (aiAssessment as { recommendedDepotId?: string }).recommendedDepotId ? (aiAssessment as unknown as DashboardSnapshot["depotRecommendations"][string][number]["aiAssessment"]) : null }
              : recommendation
          })
        ])
      ),
      aiEscalations: latestAiRows
        .filter((row) => row.decisionType === "escalation" && row.aiOutput && typeof row.aiOutput === "object" && !Array.isArray(row.aiOutput))
        .map((row) => row.aiOutput as unknown as NonNullable<DashboardSnapshot["aiEscalations"]>[number])
    }
    const forensics = this.applyForensicsOverlay(buildForensicsSnapshot(state, healthByVehicle))

    const vehicles = state.vehicles.map((vehicle) => ({
      ...vehicle,
      signal: state.signals[vehicle.id],
      health: snapshot.healthByVehicle[vehicle.id],
      faults: state.faults[vehicle.id] ?? [],
      priority: snapshot.priorityQueue.find((entry) => entry.vehicleId === vehicle.id) ?? null,
      depotRecommendations: snapshot.depotRecommendations[vehicle.id] ?? [],
      currentRequest: state.serviceRequests.find((request) => request.vehicleId === vehicle.id && request.status !== "CLOSED") ?? null
    }))

    const payload: DashboardPayload = {
      ...snapshot,
      vehicles,
      depots: state.depots,
      technicians: state.technicians,
      serviceRequests: state.serviceRequests.filter((request) => request.status !== "CLOSED"),
      forensics,
      generatedAt: nowIso()
    }

    return { state, snapshot, forensics, payload }
  }

  private async buildIntelligenceSnapshot(): Promise<IntelligenceSnapshot> {
    const [rewardSignals, decisionLogs] = await Promise.all([
      rewardSignalRepository.findRecent(200),
      prisma.aiDecisionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200
      })
    ])

    const rewardRecords = rewardSignals
      .map((signal: Awaited<ReturnType<typeof rewardSignalRepository.findRecent>>[number]) => ({
        id: signal.id,
        aiDecisionLogId: signal.aiDecisionLogId,
        rewardType: signal.rewardType,
        rewardScore: signal.rewardScore,
        rewardBreakdown: signal.rewardBreakdown && typeof signal.rewardBreakdown === "object" && !Array.isArray(signal.rewardBreakdown)
          ? Object.fromEntries(
              Object.entries(signal.rewardBreakdown).filter(([, value]) => typeof value === "number") as Array<[string, number]>
            )
          : {},
        createdAt: signal.createdAt.toISOString()
      }))
      .filter((signal) => signal.rewardType !== "technician")

    const groupedByType = new Map<string, typeof rewardRecords>()
    for (const signal of rewardRecords) {
      const list = groupedByType.get(signal.rewardType) ?? []
      list.push(signal)
      groupedByType.set(signal.rewardType, list)
    }

    const qualityTrend = [...groupedByType.entries()].map(([label, signals]) => ({
      label,
      aiScore: signals.reduce((sum: number, item: (typeof rewardRecords)[number]) => sum + item.rewardScore, 0) / Math.max(1, signals.length),
      heuristicScore: 0.5
    }))

    const activeDecisionLogs = decisionLogs.filter(
      (log: Awaited<ReturnType<typeof prisma.aiDecisionLog.findMany>>[number]) =>
        log.decisionType !== "technician"
    )
    const scoredLogIds = new Set(rewardRecords.map((item: (typeof rewardRecords)[number]) => item.aiDecisionLogId))
    const scoredDecisionLogs = activeDecisionLogs.filter((log: Awaited<ReturnType<typeof prisma.aiDecisionLog.findMany>>[number]) => scoredLogIds.has(log.id))

    const confidenceBuckets = new Map<number, { correct: number; total: number }>()
    for (const log of scoredDecisionLogs) {
      if (!log.aiOutput || typeof log.aiOutput !== "object" || Array.isArray(log.aiOutput)) continue
      const confidence = (log.aiOutput as { confidence?: unknown }).confidence
      if (typeof confidence !== "number") continue
      const bucket = Math.floor(confidence * 10) / 10
      const existing = confidenceBuckets.get(bucket) ?? { correct: 0, total: 0 }
      const reward = rewardRecords.find((item: (typeof rewardRecords)[number]) => item.aiDecisionLogId === log.id)
      existing.total += 1
      if (reward!.rewardScore >= 0.6) existing.correct += 1
      confidenceBuckets.set(bucket, existing)
    }

    const confidenceCalibration = [...confidenceBuckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([confidenceBucket, bucket]) => ({
        confidenceBucket,
        actualAccuracy: bucket.correct / Math.max(1, bucket.total),
        sampleSize: bucket.total
      }))

    const reviewItems: DecisionReviewItem[] = scoredDecisionLogs.map((log: Awaited<ReturnType<typeof prisma.aiDecisionLog.findMany>>[number]) => {
      const reward = rewardRecords.find((item: (typeof rewardRecords)[number]) => item.aiDecisionLogId === log.id)!
      return {
        decisionLogId: log.id,
        vehicleId: log.vehicleId,
        decisionType: log.decisionType,
        rewardScore: reward.rewardScore,
        createdAt: log.createdAt.toISOString(),
        summary: `${log.decisionType} decision for ${log.vehicleId}`
      }
    })

    const bestDecisions = [...reviewItems].sort((a, b) => b.rewardScore - a.rewardScore).slice(0, 10)
    const worstDecisions = [...reviewItems].sort((a, b) => a.rewardScore - b.rewardScore).slice(0, 10)
    const overrideRate = activeDecisionLogs.length
      ? activeDecisionLogs.filter((log: Awaited<ReturnType<typeof prisma.aiDecisionLog.findMany>>[number]) => log.humanOverride).length / activeDecisionLogs.length
      : 0
    const fewShotExamples = buildFewShotExamples(bestDecisions, worstDecisions)
    const weightAdjustmentProposals = buildWeightAdjustmentProposals(reviewItems)
    const learnedPatterns = buildLearnedPatterns(
      (await serviceHistoryRepository.findRecent(100)).map((record) => ({
        id: record.id,
        vehicleId: record.vehicleId,
        depotId: record.depotId,
        technicianId: record.technicianId,
        subsystem: isSubsystemKey(record.subsystem) ? record.subsystem : "engine",
        outcome: record.outcome,
        resolvedAt: record.resolvedAt.toISOString(),
        firstTimeFix: record.firstTimeFix,
        actualFault: record.actualFault,
        partsUsed: Array.isArray(record.partsUsed) ? record.partsUsed.filter((value): value is string => typeof value === "string") : [],
        repairDuration: record.repairDuration,
        diagnosisCorrect: record.diagnosisCorrect,
        technicianNotes: record.technicianNotes
      }))
    )

    return {
      rewardSignals: rewardRecords,
      qualityTrend,
      confidenceCalibration,
      bestDecisions,
      worstDecisions,
      overrideRate,
      fewShotExamples,
      weightAdjustmentProposals,
      learnedPatterns
    }
  }

  async reset() {
    this.overlay.patternStatuses.clear()
    this.overlay.investigations = []
    await resetAndSeed(prisma)
    await this.emitDashboardRefresh("service_update", { action: "reset" })
    return this.getDashboardPayload()
  }

  async getDashboardPayload() {
    const { payload } = await this.buildPayload()
    return payload
  }

  async getVehicles() {
    const { payload } = await this.buildPayload()
    return payload.vehicles
  }

  async getVehicle(vehicleId: string) {
    const { payload } = await this.buildPayload()
    return payload.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null
  }

  async getPriorityQueue() {
    const { snapshot } = await this.buildPayload()
    return snapshot.priorityQueue
  }

  async getPriority(vehicleId: string) {
    const { snapshot } = await this.buildPayload()
    return snapshot.priorityQueue.find((entry) => entry.vehicleId === vehicleId) ?? null
  }

  async getDepotRecommendations(vehicleId: string) {
    const { snapshot } = await this.buildPayload()
    return snapshot.depotRecommendations[vehicleId] ?? []
  }

  async getDispatchPlan(vehicleId: string) {
    const { state, snapshot } = await this.buildPayload()
    const vehicle = state.vehicles.find((item) => item.id === vehicleId)
    const health = snapshot.healthByVehicle[vehicleId]
    if (!vehicle || !health) return null

    const depotRecommendations = snapshot.depotRecommendations[vehicleId] ?? []
    const partsToStage = depotRecommendations[0]?.requiredParts.map((part) => part.partNumber) ?? []
    const serviceHistory = state.serviceHistory.filter((record) => record.vehicleId === vehicleId)
    const intelligence = await this.buildIntelligenceSnapshot()

    const plan = await runDispatchReasoning({
      vehicle,
      health,
      faults: state.faults[vehicleId] ?? [],
      depotRecommendations,
      serviceHistory,
      partsToStage,
      fewShotExamples: renderFewShotExamples(intelligence.fewShotExamples)
    })

    await prisma.aiDecisionLog.create({
      data: {
        vehicleId,
        decisionType: "dispatch",
        heuristicOutput: toJsonValue({
          depotRecommendations,
          partsToStage
        }),
        aiOutput: toJsonValue(plan),
        finalDecision: toJsonValue({
          depotId: plan.depotId,
          urgencyLevel: plan.urgencyLevel
        }),
        modelName: plan.model,
        latencyMs: plan.latencyMs
      }
    })

    return plan
  }

  async getServiceRequests() {
    const state = await this.loadState()
    return state.serviceRequests
  }

  async getForensics() {
    const { forensics } = await this.buildPayload()
    return forensics
  }

  async getIntelligenceSnapshot() {
    return this.buildIntelligenceSnapshot()
  }

  async getDecisionAuditTrail(vehicleId?: string) {
    const logs = await prisma.aiDecisionLog.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100
    })

    return logs.map((log) => ({
      id: log.id,
      vehicleId: log.vehicleId,
      decisionType: log.decisionType,
      decisionSubtype: log.decisionSubtype,
      heuristicOutput: log.heuristicOutput,
      aiOutput: log.aiOutput,
      finalDecision: log.finalDecision,
      humanOverride: log.humanOverride,
      overrideReason: log.overrideReason,
      modelName: log.modelName,
      latencyMs: log.latencyMs,
      createdAt: log.createdAt.toISOString()
    }))
  }

  async getCohorts() {
    return (await this.getForensics()).cohorts
  }

  async getCohort(cohortId: string) {
    return (await this.getForensics()).cohorts.find((cohort) => cohort.id === cohortId) ?? null
  }

  async getCohortComparison(cohortId: string) {
    const { state, snapshot } = await this.buildPayload()
    const cohort = this.applyForensicsOverlay(buildForensicsSnapshot(state, snapshot.healthByVehicle)).cohorts.find((item) => item.id === cohortId)
    if (!cohort) return null
    return compareCohort(cohort, state, snapshot.healthByVehicle)
  }

  async getAnomalies() {
    return (await this.getForensics()).anomalies
