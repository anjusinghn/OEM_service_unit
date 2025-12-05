import { beforeEach, describe, expect, it, vi } from "vitest"

const promptMocks = vi.hoisted(() => {
  const planningFormatMessages = vi.fn(async ({ vehicleId }: { vehicleId: string }) => [
    { type: "human", content: `Create a dispatch plan for vehicle ${vehicleId}.` }
  ])
  const planningPipe = vi.fn((model) => model)
  const summaryPipe = vi.fn((model) => model)
  let promptIndex = 0
  const fromMessages = vi.fn(() => {
    promptIndex += 1

    if (promptIndex === 1) {
      return {
        formatMessages: planningFormatMessages,
        pipe: planningPipe
      }
    }

    return {
      formatMessages: vi.fn(),
      pipe: summaryPipe
    }
  })

  return { planningFormatMessages, planningPipe, summaryPipe, fromMessages }
})

const clientMocks = vi.hoisted(() => {
  const canUseAi = vi.fn(() => false)
  const bindTools = vi.fn()
  const withStructuredOutput = vi.fn()
  const createOpenRouterClient = vi.fn(() => ({
    bindTools,
    withStructuredOutput
  }))

  return { canUseAi, bindTools, withStructuredOutput, createOpenRouterClient }
})

const toolMocks = vi.hoisted(() => {
  const vehicleLookup = {
    name: "vehicle_lookup",
    invoke: vi.fn(async () => ({ vehicleId: "v-1", nextAction: "inspect cooling" }))
  }
  const partsCheck = {
    name: "parts_check",
    invoke: vi.fn(async () => ({ partsToStage: ["brake_pad"], depotReady: true }))
  }
  const createDispatchTools = vi.fn(() => [vehicleLookup, partsCheck])

  return { vehicleLookup, partsCheck, createDispatchTools }
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

vi.mock("../dispatch-tools", () => ({
  createDispatchTools: toolMocks.createDispatchTools
}))

import type { DispatchReasoningInput } from "../dispatch-reasoning"
import { runDispatchReasoning } from "../dispatch-reasoning"

const makeInput = (overrides: Partial<DispatchReasoningInput> = {}): DispatchReasoningInput => ({
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
  depotRecommendations: [{
    depotId: "d-1", score: 85, etaHours: 2, distanceKm: 50, capacityOpen: 3,
    specialtyMatch: true, partsReady: true, reasons: ["Close proximity", "Parts ready"],
    requiredParts: []
  }],
  serviceHistory: [],
  partsToStage: ["brake_pad"],
  ...overrides
})

describe("runDispatchReasoning — heuristic fallback", () => {
  beforeEach(() => {
    clientMocks.canUseAi.mockReturnValue(false)
    clientMocks.bindTools.mockReset()
    clientMocks.withStructuredOutput.mockReset()
    clientMocks.createOpenRouterClient.mockClear()
    toolMocks.createDispatchTools.mockClear()
    toolMocks.vehicleLookup.invoke.mockClear()
    toolMocks.partsCheck.invoke.mockClear()
    promptMocks.planningFormatMessages.mockClear()
    promptMocks.planningPipe.mockClear()
    promptMocks.summaryPipe.mockClear()
