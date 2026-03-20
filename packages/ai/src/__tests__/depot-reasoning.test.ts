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

describe("runDepotReasoning", () => {
  beforeEach(() => {
    clientMocks.canUseAi.mockReturnValue(false)
    clientMocks.withStructuredOutput.mockReset()
    clientMocks.createOpenRouterClient.mockClear()
    promptMocks.pipe.mockClear()
  })

  it("returns null when AI is disabled", async () => {
    expect(await runDepotReasoning(input)).toBeNull()
  })

  it("returns a structured depot assessment when AI is enabled", async () => {
    clientMocks.canUseAi.mockReturnValue(true)

    const invoke = vi.fn().mockResolvedValue({
      recommendedDepotId: "d-1",
      reasoning: "The closest depot already has the required parts staged.",
      confidence: 0.87,
      partsRisk: null,
      logisticsNote: "Shortest ETA among viable depots."
    })

    clientMocks.withStructuredOutput.mockReturnValue({ invoke })

    const result = await runDepotReasoning(input)

    expect(clientMocks.createOpenRouterClient).toHaveBeenCalledTimes(1)
    expect(clientMocks.withStructuredOutput).toHaveBeenCalledTimes(1)
    expect(promptMocks.pipe).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith({
      vehicle: JSON.stringify(input.vehicle),
      health: JSON.stringify(input.health),
      faults: JSON.stringify(input.faults),
      recommendations: JSON.stringify(input.heuristicRecommendations),
      serviceHistory: JSON.stringify(input.serviceHistory.slice(0, 10))
    })
    expect(result).toMatchObject({
      recommendedDepotId: "d-1",
      reasoning: "The closest depot already has the required parts staged.",
      confidence: 0.87,
      partsRisk: null,
      logisticsNote: "Shortest ETA among viable depots.",
      model: "test-model"
    })
    expect(result?.latencyMs).toEqual(expect.any(Number))
  })

  it("returns null when the AI call fails", async () => {
    clientMocks.canUseAi.mockReturnValue(true)
    clientMocks.withStructuredOutput.mockReturnValue({
      invoke: vi.fn().mockRejectedValue(new Error("boom"))
    })

    await expect(runDepotReasoning(input)).resolves.toBeNull()
  })
})
