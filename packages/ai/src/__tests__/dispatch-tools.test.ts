import { describe, expect, it } from "vitest"

import type { DispatchToolContext } from "../dispatch-tools"
import { createDispatchTools } from "../dispatch-tools"

const context: DispatchToolContext = {
  vehicle: {
    id: "v-1", vin: "VIN001", make: "Tata", model: "Prima", year: 2023,
    region: "West", routeName: "R1", buildBatch: "B1", softwareVersion: "1.0",
    cargoPriority: 5, routeCriticality: 7, downtimeCostPerHour: 500,
    nextStopHours: 2, coordinates: { lat: 19.0, lng: 72.8 }, depotAffinityId: "d-1"
  },
  health: {
    overall: 65, signalQuality: 0.9, trend: "degrading", status: "watch",
    weakestSubsystem: "brakes",
    subsystems: { engine: 80, cooling: 70, brakes: 50, electrical: 75, exhaust: 60, turbo: 65, fuel: 85, transmission: 90 }
  },
  faults: [{
    id: "f-1", vehicleId: "v-1", dtcCode: "P0128", subsystem: "cooling",
    severity: "warning", title: "Coolant Issue", description: "Below threshold",
    occurredAt: "2024-01-01", occurrences: 3
  }],
  depotRecommendations: [{
    depotId: "d-1", score: 85, etaHours: 2, distanceKm: 50, capacityOpen: 3,
    specialtyMatch: true, partsReady: true, reasons: ["Close"], requiredParts: []
  }],
  serviceHistory: [
    {
      id: "sh-1", vehicleId: "v-1", depotId: "d-1", technicianId: "t-1",
      subsystem: "brakes", outcome: "repaired", resolvedAt: "2024-01-01", firstTimeFix: true
    },
    {
      id: "sh-2", vehicleId: "v-1", depotId: "d-1", technicianId: "t-1",
      subsystem: "engine", outcome: "repaired", resolvedAt: "2024-01-02", firstTimeFix: true
    }
  ],
  partsToStage: ["brake_pad"]
}

describe("createDispatchTools", () => {
  it("creates 6 tools", () => {
    const tools = createDispatchTools(context)
    expect(tools).toHaveLength(6)
  })

  it("vehicle_lookup returns vehicle, health, and faults", async () => {
    const tools = createDispatchTools(context)
    const vehicleTool = tools.find((t) => t.name === "vehicle_lookup")!
    const result = JSON.parse(await vehicleTool.invoke({}) as string)
    expect(result.vehicle.id).toBe("v-1")
    expect(result.health.overall).toBe(65)
    expect(result.faults).toHaveLength(1)
  })

  it("depot_lookup returns depot recommendations", async () => {
    const tools = createDispatchTools(context)
    const depotTool = tools.find((t) => t.name === "depot_lookup")!
    const result = JSON.parse(await depotTool.invoke({}) as string)
    expect(result).toHaveLength(1)
    expect(result[0].depotId).toBe("d-1")
