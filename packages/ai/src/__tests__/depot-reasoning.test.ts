import { beforeEach, describe, expect, it, vi } from "vitest"

const promptMocks = vi.hoisted(() => {
  const pipe = vi.fn((model) => model)
  const fromMessages = vi.fn(() => ({
    pipe
  }))

  return { pipe, fromMessages }
})

const clientMocks = vi.hoisted(() => {
  const canUseAi = vi.fn(() => false)
  const withStructuredOutput = vi.fn()
  const createOpenRouterClient = vi.fn(() => ({
    withStructuredOutput
  }))

  return { canUseAi, withStructuredOutput, createOpenRouterClient }
})

vi.mock("@langchain/core/prompts", () => ({
  ChatPromptTemplate: {
    fromMessages: promptMocks.fromMessages
  }
}))

vi.mock("../client", () => ({
  canUseAi: clientMocks.canUseAi,
  aiConfig: { model: "test-model", maxToolSteps: 8 },
  createOpenRouterClient: clientMocks.createOpenRouterClient
}))

import type { DepotReasoningInput } from "../depot-reasoning"
import { runDepotReasoning } from "../depot-reasoning"

const input: DepotReasoningInput = {
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
    severity: "warning", title: "Coolant Thermostat", description: "Below threshold",
    occurredAt: "2024-01-01", occurrences: 3
  }],
  heuristicRecommendations: [{
    depotId: "d-1", score: 85, etaHours: 2, distanceKm: 50, capacityOpen: 3,
    specialtyMatch: true, partsReady: true, reasons: ["Close proximity"], requiredParts: []
  }],
  serviceHistory: []
}
