import { describe, expect, it, vi } from "vitest"

vi.mock("../client", () => ({
  canUseAi: vi.fn(() => false),
  aiConfig: { model: "test-model", maxToolSteps: 8 },
  createOpenRouterClient: vi.fn()
}))

import type { EscalationReasoningInput } from "../escalation-reasoning"
import { runEscalationReasoning } from "../escalation-reasoning"

import type { Depot, HealthScore, ServiceRequest, Vehicle } from "@kaz/shared"

const makeInput = (overrides: Partial<EscalationReasoningInput> = {}): EscalationReasoningInput => ({
  vehicles: [],
  healthByVehicle: {},
  depots: [],
  technicians: [],
  serviceRequests: [],
  ...overrides
})

const makeVehicle = (id: string): Vehicle => ({
  id, vin: `VIN-${id}`, make: "Tata", model: "Prima", year: 2023,
  region: "West", routeName: "R1", buildBatch: "B1", softwareVersion: "1.0",
  cargoPriority: 5, routeCriticality: 7, downtimeCostPerHour: 500,
  nextStopHours: 2, coordinates: { lat: 19.0, lng: 72.8 }, depotAffinityId: "d-1"
})

const criticalHealth: HealthScore = {
  overall: 25, signalQuality: 0.9, trend: "degrading", status: "critical",
  weakestSubsystem: "engine",
  subsystems: { engine: 20, cooling: 30, brakes: 25, electrical: 30, exhaust: 30, turbo: 25, fuel: 30, transmission: 30 }
}

const makeServiceRequest = (id: string): ServiceRequest => ({
  id, vehicleId: `v-${id}`, priorityScore: 70, weakestSubsystem: "engine",
  depotId: null, technicianId: null, requiredPartNumbers: [],
  status: "DETECTED", createdAt: "2024-01-01", scheduledFor: null, timeline: []
})

const makeDepot = (id: string, totalBays: number, occupiedBays: number): Depot => ({
  id, name: `Depot ${id}`, city: "Mumbai", region: "West",
  coordinates: { lat: 19.0, lng: 72.8 }, specialties: ["engine"],
  totalBays, occupiedBays
})

describe("runEscalationReasoning — heuristic escalations", () => {
  it("returns empty array when no conditions are met", async () => {
    expect(await runEscalationReasoning(makeInput())).toEqual([])
  })

  describe("capacity_crunch", () => {
    it("triggers when depot bay utilization >= 75%", async () => {
      const result = await runEscalationReasoning(makeInput({
        depots: [makeDepot("depot-1", 4, 3)]
      }))
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe("capacity_crunch")
      expect(result[0].severity).toBe("warning")
      expect(result[0].affectedEntities).toContain("depot-1")
    })

    it("does not trigger when utilization < 75%", async () => {
      const result = await runEscalationReasoning(makeInput({
        depots: [makeDepot("depot-1", 4, 2)]
      }))
      expect(result.filter((e) => e.type === "capacity_crunch")).toHaveLength(0)
    })

    it("handles depot with 0 totalBays via Math.max guard", async () => {
      const result = await runEscalationReasoning(makeInput({
        depots: [makeDepot("depot-1", 0, 0)]
      }))
      expect(result.filter((e) => e.type === "capacity_crunch")).toHaveLength(0)
    })

    it("collects multiple overloaded depots", async () => {
      const result = await runEscalationReasoning(makeInput({
        depots: [makeDepot("d-1", 4, 4), makeDepot("d-2", 4, 3)]
      }))
      const esc = result.find((e) => e.type === "capacity_crunch")!
      expect(esc.affectedEntities).toContain("d-1")
      expect(esc.affectedEntities).toContain("d-2")
    })

    it("uses first overloaded depot name in description", async () => {
      const result = await runEscalationReasoning(makeInput({
        depots: [makeDepot("d-1", 4, 4)]
      }))
      expect(result[0].description).toContain("Depot d-1")
    })
  })

  describe("sla_risk", () => {
    it("triggers when service requests >= 5", async () => {
      const serviceRequests = Array.from({ length: 5 }, (_, i) => makeServiceRequest(`sr-${i}`))
