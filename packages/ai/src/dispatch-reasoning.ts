import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { ChatPromptTemplate } from "@langchain/core/prompts"

import type { AiDispatchPlan, DepotRecommendation, HealthScore, ServiceHistoryRecord, Vehicle, VehicleFault } from "@kaz/shared"

import { aiConfig, canUseAi, createOpenRouterClient } from "./client"
import { createDispatchTools } from "./dispatch-tools"
import { dispatchPlanSchema } from "./output-schemas"

export type DispatchReasoningInput = {
  vehicle: Vehicle
  health: HealthScore
  faults: VehicleFault[]
  depotRecommendations: DepotRecommendation[]
  serviceHistory: ServiceHistoryRecord[]
  partsToStage: string[]
  fewShotExamples?: string
}

const planningPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a fleet dispatch planner. Use tools when needed to inspect vehicle, depot, parts, service history, fleet stats, and similar cases before proposing a dispatch plan."
  ],
  ["human", "Create a dispatch plan for vehicle {vehicleId}." ]
])

const summarizationPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a fleet dispatch planner. Convert the gathered context and trace into a complete structured dispatch plan."
  ],
  ["human", "DispatchContext: {dispatchContext}\nAgentTrace: {agentTrace}\nFewShotExamples: {fewShotExamples}"]
])

const heuristicDispatchFallback = (input: DispatchReasoningInput): AiDispatchPlan => {
  const depot = input.depotRecommendations[0]

  return {
    depotId: depot?.depotId ?? "",
    depotReasoning: depot?.reasons.join(" ") ?? "No depot recommendation available.",
    partsToStage: input.partsToStage,
    estimatedRepairHours: 4,
    estimatedTotalCost: Math.max(1, input.partsToStage.length) * 2500,
    urgencyLevel: input.health.status === "critical" ? "urgent" : input.health.status === "watch" ? "elevated" : "routine",
    watchPoints: input.faults.map((fault) => fault.title).slice(0, 3),
    alternativePlan: input.depotRecommendations[1]
      ? {
          depotId: input.depotRecommendations[1].depotId,
          reasoning: input.depotRecommendations[1].reasons.join(" ")
        }
      : null,
    confidence: 0.5,
    agentTrace: [
      "vehicle_lookup",
      "depot_lookup",
      "parts_check",
      "service_history",
      "fleet_stats",
      "similar_cases",
      "fallback: heuristic dispatch used"
    ],
    model: null,
    latencyMs: null
  }
