import { EventEmitter } from "node:events"

import { applyMockTick, createMockState } from "@kaz/oem-adapters-mock"
import {
  buildForensicsSnapshot,
  advanceInvestigation as advanceInvestigationEngine,
  createInvestigation as createInvestigationEngine,
  buildEvidencePackage as buildEvidenceEngine,
  compareCohort
} from "@kaz/forensics"
import {
  buildPriorityQueue,
  buildSnapshot,
  createServiceRequest,
  getNextServiceStatus,
  recommendDepots
} from "@kaz/orchestration"
import { computeHealthScore, dedupeAlerts } from "@kaz/signal-trust"
import {
  createId,
  nowIso,
  type DashboardSnapshot,
  type DemoState,
  type ForensicsSnapshot,
  type HealthScore,
  type InvestigationStatus,
  type IntelligenceSnapshot,
  type LivePulse,
  type PatternStatus,
  type ServiceHistoryRecord,
  type ServiceRequest,
  type ServiceRequestStatus,
  type Vehicle
} from "@kaz/shared"

type ServiceActionResult = {
  request: ServiceRequest
  livePulse: LivePulse
}

export class DemoStore {
  private state: DemoState
  private snapshot: DashboardSnapshot
  private readonly emitter = new EventEmitter()
  private timer: NodeJS.Timeout

  constructor() {
    this.state = createMockState(42)
    this.snapshot = this.computeSnapshot()
    this.state.forensics = buildForensicsSnapshot(this.state, this.snapshot.healthByVehicle)
    this.timer = setInterval(() => this.tick(), 12_000)
  }

  dispose() {
    clearInterval(this.timer)
  }

  subscribe(listener: () => void) {
    this.emitter.on("change", listener)
    return () => this.emitter.off("change", listener)
  }

  reset() {
    this.state = createMockState(42)
    this.snapshot = this.computeSnapshot()
    this.state.forensics = buildForensicsSnapshot(this.state, this.snapshot.healthByVehicle)
    this.emitChange()
    return this.getDashboardPayload()
  }

  getDashboardPayload() {
    const openRequests = this.state.serviceRequests.filter((request) => request.status !== "CLOSED")
    const vehicles = this.state.vehicles.map((vehicle) => this.materializeVehicle(vehicle))

    return {
      ...this.snapshot,
      vehicles,
      depots: this.state.depots,
      technicians: this.state.technicians,
      serviceRequests: openRequests,
      forensics: this.state.forensics,
      generatedAt: nowIso()
    }
  }

  getVehicles() {
    return this.state.vehicles.map((vehicle) => this.materializeVehicle(vehicle))
  }

  getVehicle(vehicleId: string) {
    const vehicle = this.state.vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) return null
    return this.materializeVehicle(vehicle)
  }

  getPriorityQueue() {
    return this.snapshot.priorityQueue
  }

  getPriority(vehicleId: string) {
    return this.snapshot.priorityQueue.find((entry) => entry.vehicleId === vehicleId) ?? null
  }

  getDepotRecommendations(vehicleId: string) {
    return this.snapshot.depotRecommendations[vehicleId] ?? []
  }

  getServiceRequests() {
    return this.state.serviceRequests
  }

  getForensics(): ForensicsSnapshot {
    return this.state.forensics
  }

  getIntelligenceSnapshot(): IntelligenceSnapshot {
    return {
      rewardSignals: [],
      qualityTrend: [],
      confidenceCalibration: [],
      bestDecisions: [],
      worstDecisions: [],
      overrideRate: 0,
      fewShotExamples: [],
      weightAdjustmentProposals: [],
      learnedPatterns: []
    }
  }

  getDecisionAuditTrail(_vehicleId?: string) {
    return []
  }

  getCohorts() {
    return this.state.forensics.cohorts
  }

  getCohort(cohortId: string) {
    return this.state.forensics.cohorts.find((c) => c.id === cohortId) ?? null
  }

  getCohortComparison(cohortId: string) {
    const cohort = this.getCohort(cohortId)
    if (!cohort) return null
    return compareCohort(cohort, this.state, this.snapshot.healthByVehicle)
  }

  getAnomalies() {
    return this.state.forensics.anomalies
  }

  getPatterns() {
    return this.state.forensics.patterns
  }

  getPattern(patternId: string) {
    return this.state.forensics.patterns.find((p) => p.id === patternId) ?? null
  }

  updatePatternStatus(patternId: string, status: PatternStatus) {
    const pattern = this.state.forensics.patterns.find((p) => p.id === patternId)
    if (!pattern) return null
    pattern.status = status
    this.emitChange()
    return pattern
  }

  getInvestigations() {
    return this.state.forensics.investigations
  }

  getInvestigation(investigationId: string) {
    return this.state.forensics.investigations.find((i) => i.id === investigationId) ?? null
  }

  openInvestigation(anomalyId?: string, patternId?: string) {
    const anomaly = anomalyId ? this.state.forensics.anomalies.find((a) => a.id === anomalyId) ?? null : null
    const pattern = patternId ? this.state.forensics.patterns.find((p) => p.id === patternId) ?? null : null
    const affectedVehicleIds = anomaly
      ? this.state.forensics.cohorts.find((c) => c.id === anomaly.cohortId)?.vehicleIds ?? []
      : []

    const investigation = createInvestigationEngine(anomaly, pattern, affectedVehicleIds)
    this.state.forensics.investigations = [investigation, ...this.state.forensics.investigations]
    const livePulse = this.addLivePulse("dispatch", `Investigation opened: ${investigation.title}`)
    this.emitChange()
    return { investigation, livePulse }
  }

  advanceInvestigationStatus(investigationId: string, status?: InvestigationStatus) {
    const investigation = this.state.forensics.investigations.find((i) => i.id === investigationId)
    if (!investigation) return null

    const updated = advanceInvestigationEngine(investigation, status)
    const idx = this.state.forensics.investigations.findIndex((i) => i.id === investigationId)
    this.state.forensics.investigations[idx] = updated

    const livePulse = this.addLivePulse("progress", `Investigation ${investigationId} moved to ${updated.status}.`)
    this.emitChange()
    return { investigation: updated, livePulse }
  }
