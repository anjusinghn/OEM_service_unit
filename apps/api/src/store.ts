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
