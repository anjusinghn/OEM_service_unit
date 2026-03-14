import { EventEmitter } from "node:events"

import { applyMockTick, createMockState } from "@kaz/oem-adapters-mock"
import {
  buildPriorityQueue,
  buildSnapshot,
  createServiceRequest,
  getNextServiceStatus,
  recommendDepots,
  recommendTechnicians
} from "@kaz/orchestration"
import { computeHealthScore, dedupeAlerts } from "@kaz/signal-trust"
import {
  createId,
  nowIso,
  type DashboardSnapshot,
  type DemoState,
  type HealthScore,
  type LivePulse,
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

  getTechRecommendations(vehicleId: string) {
    return this.snapshot.technicianRecommendations[vehicleId] ?? []
  }

  getServiceRequests() {
    return this.state.serviceRequests
  }

  dispatchVehicle(vehicleId: string): ServiceActionResult | null {
    const existing = this.state.serviceRequests.find(
      (request) => request.vehicleId === vehicleId && request.status !== "CLOSED"
    )
    if (existing) {
      return {
        request: existing,
        livePulse: this.addLivePulse("dispatch", `Vehicle ${vehicleId} already has an active service request.`)
      }
    }

    const priority = this.getPriority(vehicleId)
    const health = this.snapshot.healthByVehicle[vehicleId]
    const depot = this.getDepotRecommendations(vehicleId)[0]
    const technician = depot ? recommendTechnicians(this.state, depot.depotId, health.weakestSubsystem)[0] : undefined
    if (!priority || !depot || !technician) return null

    const request = createServiceRequest(
      this.state,
      vehicleId,
      priority.score,
      health.weakestSubsystem,
      depot.depotId,
      technician.technicianId,
      depot.requiredParts.map((part) => part.partNumber)
    )

    this.state.serviceRequests = [request, ...this.state.serviceRequests]
    this.adjustDepotCapacity(request.depotId, 1)
    const livePulse = this.addLivePulse(
      "dispatch",
      `Vehicle ${vehicleId} dispatched to ${depot.depotId} with ${technician.technicianId}.`
    )
    this.recompute()
    return { request, livePulse }
  }

  advanceRequest(requestId: string, status?: ServiceRequestStatus): ServiceActionResult | null {
    const request = this.state.serviceRequests.find((item) => item.id === requestId)
    if (!request) return null

    const nextStatus = status ?? getNextServiceStatus(request.status)
    if (nextStatus === request.status) return null

    request.status = nextStatus
    const note = this.noteForStatus(nextStatus, request)
    request.timeline = [...request.timeline, { status: nextStatus, at: nowIso(), note }]
    if (nextStatus === "SCHEDULED") {
      request.scheduledFor = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
    }
    if (nextStatus === "CLOSED") {
      this.adjustDepotCapacity(request.depotId, -1)
    }

    const livePulse = this.addLivePulse("progress", `Service request ${request.id} moved to ${nextStatus}.`)
    this.recompute()
    return { request, livePulse }
  }

  completeRequest(requestId: string): ServiceActionResult | null {
    const request = this.state.serviceRequests.find((item) => item.id === requestId)
    if (!request) return null

    request.status = "COMPLETED"
    request.timeline = [
      ...request.timeline,
      {
        status: "COMPLETED",
        at: nowIso(),
        note: `Technician ${request.technicianId ?? "unassigned"} confirmed fix and cleared active faults.`
      }
    ]

    this.state.faults[request.vehicleId] = []
    const signal = this.state.signals[request.vehicleId]
    this.state.signals[request.vehicleId] = {
      ...signal,
      coolantTemp: Math.max(86, signal.coolantTemp - 6),
      oilPressure: signal.oilPressure + 6,
      batteryVoltage: signal.batteryVoltage + 0.3,
      turboBoost: signal.turboBoost + 0.2,
      brakeWear: Math.max(32, signal.brakeWear - 10),
      exhaustTemp: Math.max(360, signal.exhaustTemp - 28)
    }

    const historyRecord: ServiceHistoryRecord = {
      id: createId("srvhist", this.state.serviceHistory.length + 1),
      vehicleId: request.vehicleId,
      depotId: request.depotId ?? this.state.vehicles[0].depotAffinityId,
      technicianId: request.technicianId ?? this.state.technicians[0].id,
      subsystem: request.weakestSubsystem,
      outcome: `Completed ${request.weakestSubsystem} intervention with staged orchestration workflow.`,
      resolvedAt: nowIso(),
      firstTimeFix: true
    }

    this.state.serviceHistory = [historyRecord, ...this.state.serviceHistory]
    const livePulse = this.addLivePulse(
      "complete",
      `Service request ${request.id} completed. Vehicle ${request.vehicleId} health rebounded.`
    )
    this.recompute()
    return { request, livePulse }
  }

  private tick() {
    this.state = applyMockTick(this.state)
    this.recompute()
  }

  private recompute() {
    this.snapshot = this.computeSnapshot()
    this.emitChange()
  }

  private emitChange() {
    this.emitter.emit("change")
  }

  private computeSnapshot(): DashboardSnapshot {
    const healthByVehicle = Object.fromEntries(
      this.state.vehicles.map((vehicle) => [
        vehicle.id,
        computeHealthScore(this.state.signals[vehicle.id], this.state.faults[vehicle.id])
      ])
    ) as Record<string, HealthScore>
    const alerts = dedupeAlerts(this.state.faults).slice(0, 20)
    return buildSnapshot(this.state, healthByVehicle, alerts)
  }

  private materializeVehicle(vehicle: Vehicle) {
    return {
      ...vehicle,
      signal: this.state.signals[vehicle.id],
      health: this.snapshot.healthByVehicle[vehicle.id],
      faults: this.state.faults[vehicle.id],
      priority: this.getPriority(vehicle.id),
      depotRecommendations: this.getDepotRecommendations(vehicle.id),
      technicianRecommendations: this.getTechRecommendations(vehicle.id),
      currentRequest:
        this.state.serviceRequests.find((request) => request.vehicleId === vehicle.id && request.status !== "CLOSED") ?? null
    }
  }

  private addLivePulse(kind: LivePulse["kind"], message: string) {
    const pulse: LivePulse = {
      id: createId("pulse", this.state.livePulse.length + 1),
      kind,
      message,
      at: nowIso()
    }
    this.state.livePulse = [pulse, ...this.state.livePulse].slice(0, 24)
    return pulse
  }

  private noteForStatus(status: ServiceRequestStatus, request: ServiceRequest) {
    switch (status) {
      case "PARTS_CONFIRMED":
        return `Depot ${request.depotId ?? "unknown"} confirmed part pick readiness.`
      case "TECHNICIAN_ASSIGNED":
        return `Technician ${request.technicianId ?? "unknown"} accepted the assignment.`
      case "SCHEDULED":
        return `Vehicle booked into service bay window.`
      case "IN_PROGRESS":
        return `Vehicle entered active service bay.`
      case "CLOSED":
        return `Workflow closed after confirmation of stable telemetry.`
      default:
        return `Transitioned to ${status}.`
    }
  }

  private adjustDepotCapacity(depotId: string | null, delta: number) {
    if (!depotId) return
    this.state.depots = this.state.depots.map((depot) =>
      depot.id === depotId
        ? {
            ...depot,
            occupiedBays: Math.max(0, Math.min(depot.totalBays, depot.occupiedBays + delta))
          }
        : depot
    )
  }
}

export const demoStore = new DemoStore()
