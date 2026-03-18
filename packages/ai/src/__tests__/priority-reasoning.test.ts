import { describe, expect, it, vi } from "vitest"

vi.mock("../client", () => ({
  canUseAi: vi.fn(() => false),
  aiConfig: { model: "test-model", maxToolSteps: 8 },
  createOpenRouterClient: vi.fn()
}))

import type { PriorityReasoningInput } from "../priority-reasoning"
import { runPriorityReasoning } from "../priority-reasoning"

const input: PriorityReasoningInput = {
  vehicle: {
    id: "v-1", vin: "VIN001", make: "Tata", model: "Prima", year: 2023,
    region: "West", routeName: "R1", buildBatch: "B1", softwareVersion: "1.0",
    cargoPriority: 5, routeCriticality: 7, downtimeCostPerHour: 500,
    nextStopHours: 2, coordinates: { lat: 19.0, lng: 72.8 }, depotAffinityId: "d-1"
  },
  signal: {
    vehicleId: "v-1", timestamp: "2024-01-01", coolantTemp: 90, oilPressure: 40,
    batteryVoltage: 12.5, turboBoost: 1.5, brakeWear: 30, exhaustTemp: 350,
    fuelLevel: 60, speed: 80, mileage: 100000
  },
  health: {
    overall: 65, signalQuality: 0.9, trend: "degrading", status: "watch",
    weakestSubsystem: "brakes",
    subsystems: { engine: 80, cooling: 70, brakes: 50, electrical: 75, exhaust: 60, turbo: 65, fuel: 85, transmission: 90 }
  },
  faults: [{
    id: "f-1", vehicleId: "v-1", dtcCode: "P0128", subsystem: "cooling",
    severity: "warning", title: "Coolant Thermostat", description: "Below threshold",
    occurredAt: "2024-01-01", occurrences: 3
  }],
  heuristic: {
    vehicleId: "v-1", score: 72, status: "watch",
    breakdown: {
      safetyUrgency: 7, failureProximity: 6, businessImpact: 5,
      downtimeCost: 4, serviceWindow: 3, reasons: ["brake wear"]
    }
  },
  serviceHistory: []
}

describe("runPriorityReasoning", () => {
  it("returns null when AI is disabled", async () => {
    expect(await runPriorityReasoning(input)).toBeNull()
  })
})
