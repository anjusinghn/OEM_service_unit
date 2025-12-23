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
  })

  it("returns heuristic plan when AI is disabled", async () => {
    const result = await runDispatchReasoning(makeInput())
    expect(result.depotId).toBe("d-1")
    expect(result.model).toBeNull()
    expect(result.latencyMs).toBeNull()
    expect(result.confidence).toBe(0.5)
  })

  it("joins depot reasons as depotReasoning", async () => {
    const result = await runDispatchReasoning(makeInput())
    expect(result.depotReasoning).toBe("Close proximity Parts ready")
  })

  it("sets urgencyLevel to 'urgent' for critical health", async () => {
    const result = await runDispatchReasoning(makeInput({
      health: {
        overall: 30, signalQuality: 0.9, trend: "degrading", status: "critical",
        weakestSubsystem: "brakes",
        subsystems: { engine: 30, cooling: 30, brakes: 20, electrical: 30, exhaust: 30, turbo: 30, fuel: 30, transmission: 30 }
      }
    }))
    expect(result.urgencyLevel).toBe("urgent")
  })

  it("sets urgencyLevel to 'elevated' for watch health", async () => {
    const result = await runDispatchReasoning(makeInput())
    expect(result.urgencyLevel).toBe("elevated")
  })

  it("sets urgencyLevel to 'routine' for healthy status", async () => {
    const result = await runDispatchReasoning(makeInput({
      health: {
        overall: 90, signalQuality: 0.95, trend: "stable", status: "healthy",
        weakestSubsystem: "engine",
        subsystems: { engine: 80, cooling: 85, brakes: 90, electrical: 85, exhaust: 80, turbo: 85, fuel: 95, transmission: 90 }
      }
    }))
    expect(result.urgencyLevel).toBe("routine")
  })

  it("includes fault titles as watchPoints (max 3)", async () => {
    const faults = Array.from({ length: 5 }, (_, i) => ({
      id: `f-${i}`, vehicleId: "v-1", dtcCode: `P000${i}`, subsystem: "engine" as const,
      severity: "warning" as const, title: `Fault ${i}`, description: "desc",
      occurredAt: "2024-01-01", occurrences: 1
    }))
    const result = await runDispatchReasoning(makeInput({ faults }))
    expect(result.watchPoints).toHaveLength(3)
    expect(result.watchPoints).toEqual(["Fault 0", "Fault 1", "Fault 2"])
  })

  it("includes alternativePlan when second depot exists", async () => {
    const result = await runDispatchReasoning(makeInput({
      depotRecommendations: [
        {
          depotId: "d-1", score: 85, etaHours: 2, distanceKm: 50, capacityOpen: 3,
          specialtyMatch: true, partsReady: true, reasons: ["Primary"], requiredParts: []
        },
        {
          depotId: "d-2", score: 70, etaHours: 4, distanceKm: 100, capacityOpen: 1,
          specialtyMatch: false, partsReady: false, reasons: ["Backup option"], requiredParts: []
        }
      ]
    }))
    expect(result.alternativePlan).not.toBeNull()
    expect(result.alternativePlan!.depotId).toBe("d-2")
    expect(result.alternativePlan!.reasoning).toBe("Backup option")
  })

  it("sets alternativePlan to null when only one depot", async () => {
    const result = await runDispatchReasoning(makeInput())
    expect(result.alternativePlan).toBeNull()
  })

  it("calculates estimatedTotalCost based on parts count", async () => {
    const result = await runDispatchReasoning(makeInput({ partsToStage: ["p1", "p2", "p3"] }))
    expect(result.estimatedTotalCost).toBe(3 * 2500)
  })

  it("uses minimum 1 for cost calculation with empty parts", async () => {
    const result = await runDispatchReasoning(makeInput({ partsToStage: [] }))
    expect(result.estimatedTotalCost).toBe(2500)
  })

  it("includes partsToStage in result", async () => {
    const result = await runDispatchReasoning(makeInput({ partsToStage: ["brake_pad", "rotor"] }))
    expect(result.partsToStage).toEqual(["brake_pad", "rotor"])
  })

  it("includes agentTrace with fallback marker", async () => {
    const result = await runDispatchReasoning(makeInput())
    expect(result.agentTrace).toContain("fallback: heuristic dispatch used")
    expect(result.agentTrace).toContain("vehicle_lookup")
  })

  it("has estimatedRepairHours of 4", async () => {
    const result = await runDispatchReasoning(makeInput())
    expect(result.estimatedRepairHours).toBe(4)
  })

  it("handles empty recommendations gracefully", async () => {
    const result = await runDispatchReasoning(makeInput({
      depotRecommendations: []
    }))
    expect(result.depotId).toBe("")
    expect(result.depotReasoning).toBe("No depot recommendation available.")
    expect(result.alternativePlan).toBeNull()
  })

  it("handles empty faults → empty watchPoints", async () => {
    const result = await runDispatchReasoning(makeInput({ faults: [] }))
    expect(result.watchPoints).toEqual([])
  })
})

describe("runDispatchReasoning — AI flow", () => {
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
  })

  it("runs dispatch tools and returns the structured AI plan", async () => {
    clientMocks.canUseAi.mockReturnValue(true)

    const planningInvoke = vi.fn()
      .mockResolvedValueOnce({
        tool_calls: [
          { name: "vehicle_lookup", id: "call-1", args: {} },
          { name: "parts_check", id: "call-2", args: {} }
        ]
      })
      .mockResolvedValueOnce({
        tool_calls: []
      })

    const summaryInvoke = vi.fn().mockResolvedValue({
      depotId: "d-9",
      depotReasoning: "AI picked the depot with ready parts and shortest ETA.",
      partsToStage: ["brake_pad", "rotor"],
      estimatedRepairHours: 6,
      estimatedTotalCost: 9000,
      urgencyLevel: "urgent",
      watchPoints: ["Coolant Thermostat"],
      alternativePlan: {
        depotId: "d-2",
        reasoning: "Fallback depot with slower ETA."
      },
      confidence: 0.91,
      agentTrace: ["ignored-by-runtime"]
    })

    clientMocks.bindTools.mockReturnValue({ invoke: planningInvoke })
    clientMocks.withStructuredOutput.mockReturnValue({ invoke: summaryInvoke })

    const input = makeInput({ fewShotExamples: "Case memory: cooling fault repeat." })
    const result = await runDispatchReasoning(input)

    expect(clientMocks.createOpenRouterClient).toHaveBeenCalledTimes(2)
    expect(clientMocks.bindTools).toHaveBeenCalledTimes(1)
    expect(clientMocks.withStructuredOutput).toHaveBeenCalledTimes(1)
    expect(promptMocks.planningFormatMessages).toHaveBeenCalledWith({ vehicleId: "v-1" })
    expect(promptMocks.planningPipe).toHaveBeenCalledTimes(0)
    expect(promptMocks.summaryPipe).toHaveBeenCalledTimes(1)
    expect(toolMocks.createDispatchTools).toHaveBeenCalledWith(input)
    expect(planningInvoke).toHaveBeenCalledTimes(2)
    expect(toolMocks.vehicleLookup.invoke).toHaveBeenCalledWith({})
    expect(toolMocks.partsCheck.invoke).toHaveBeenCalledWith({})
    expect(summaryInvoke).toHaveBeenCalledWith({
      dispatchContext: JSON.stringify({
        vehicle: input.vehicle,
        health: input.health,
        faults: input.faults,
        depotRecommendations: input.depotRecommendations,
        serviceHistory: input.serviceHistory.slice(0, 10),
        partsToStage: input.partsToStage
      }),
      agentTrace: JSON.stringify(["vehicle_lookup", "parts_check"]),
      fewShotExamples: "Case memory: cooling fault repeat."
    })
    expect(result).toMatchObject({
      depotId: "d-9",
      depotReasoning: "AI picked the depot with ready parts and shortest ETA.",
      partsToStage: ["brake_pad", "rotor"],
      estimatedRepairHours: 6,
      estimatedTotalCost: 9000,
      urgencyLevel: "urgent",
      watchPoints: ["Coolant Thermostat"],
      alternativePlan: {
        depotId: "d-2",
        reasoning: "Fallback depot with slower ETA."
      },
      confidence: 0.91,
      agentTrace: ["vehicle_lookup", "parts_check"],
      model: "test-model"
    })
    expect(result.latencyMs).toEqual(expect.any(Number))
  })

  it("falls back to heuristics when the AI planner throws", async () => {
    clientMocks.canUseAi.mockReturnValue(true)
    clientMocks.bindTools.mockReturnValue({
      invoke: vi.fn().mockRejectedValue(new Error("planner failed"))
    })

    const result = await runDispatchReasoning(makeInput())

    expect(toolMocks.createDispatchTools).toHaveBeenCalledTimes(1)
    expect(result.model).toBeNull()
    expect(result.latencyMs).toBeNull()
    expect(result.agentTrace).toContain("fallback: heuristic dispatch used")
  })
})
