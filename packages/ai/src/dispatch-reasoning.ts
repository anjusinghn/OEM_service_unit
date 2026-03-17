import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { ChatPromptTemplate } from "@langchain/core/prompts"

import type { AiDispatchPlan, DepotRecommendation, HealthScore, ServiceHistoryRecord, TechnicianRecommendation, Vehicle, VehicleFault } from "@kaz/shared"

import { aiConfig, canUseAi, createOpenRouterClient } from "./client"
import { createDispatchTools } from "./dispatch-tools"
import { dispatchPlanSchema } from "./output-schemas"

export type DispatchReasoningInput = {
  vehicle: Vehicle
  health: HealthScore
  faults: VehicleFault[]
  depotRecommendations: DepotRecommendation[]
  technicianRecommendations: TechnicianRecommendation[]
  serviceHistory: ServiceHistoryRecord[]
  partsToStage: string[]
  fewShotExamples?: string
}

const planningPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a fleet dispatch planner. Use tools when needed to inspect vehicle, depot, parts, technician, service history, fleet stats, and similar cases before proposing a dispatch plan."
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
  const technician = input.technicianRecommendations[0]

  return {
    depotId: depot?.depotId ?? "",
    depotReasoning: depot?.reasons.join(" ") ?? "No depot recommendation available.",
    technicianId: technician?.technicianId ?? "",
    techReasoning: technician?.reasons.join(" ") ?? "No technician recommendation available.",
    partsToStage: input.partsToStage,
    estimatedRepairHours: 4,
    estimatedTotalCost: Math.max(1, input.partsToStage.length) * 2500,
    urgencyLevel: input.health.status === "critical" ? "urgent" : input.health.status === "watch" ? "elevated" : "routine",
    watchPoints: input.faults.map((fault) => fault.title).slice(0, 3),
    alternativePlan: input.depotRecommendations[1]
      ? {
          depotId: input.depotRecommendations[1].depotId,
          technicianId: input.technicianRecommendations[1]?.technicianId ?? null,
          reasoning: input.depotRecommendations[1].reasons.join(" ")
        }
      : null,
    confidence: 0.5,
    agentTrace: [
      "vehicle_lookup",
      "depot_lookup",
      "parts_check",
      "tech_lookup",
      "service_history",
      "fleet_stats",
      "similar_cases",
      "fallback: heuristic dispatch used"
    ],
    model: null,
    latencyMs: null
  }
}

export const runDispatchReasoning = async (input: DispatchReasoningInput): Promise<AiDispatchPlan> => {
  if (!canUseAi()) {
    return heuristicDispatchFallback(input)
  }

  const startedAt = Date.now()
  const tools = createDispatchTools(input)
  const toolMap = new Map(tools.map((toolItem) => [toolItem.name, toolItem]))
  const agentTrace: string[] = []

  try {
    const planningModel = createOpenRouterClient().bindTools(tools)
    const formattedPrompt = await planningPrompt.formatMessages({ vehicleId: input.vehicle.id })
    const messages: Array<HumanMessage | AIMessage | ToolMessage> = [...formattedPrompt.filter((message): message is HumanMessage | AIMessage | ToolMessage => Boolean(message))]

    for (let step = 0; step < aiConfig.maxToolSteps; step += 1) {
      const response = await planningModel.invoke(messages)
      messages.push(response)

      if (!response.tool_calls?.length) {
        break
      }

      for (const toolCall of response.tool_calls) {
        const toolItem = toolMap.get(toolCall.name)
        if (!toolItem) continue
        const result = await toolItem.invoke(toolCall.args ?? {})
        agentTrace.push(toolCall.name)
        messages.push(
          new ToolMessage({
            tool_call_id: toolCall.id ?? toolCall.name,
            content: typeof result === "string" ? result : JSON.stringify(result)
          })
        )
      }
    }

    const summaryModel = createOpenRouterClient().withStructuredOutput(dispatchPlanSchema)
    const summaryChain = summarizationPrompt.pipe(summaryModel)
    const result = await summaryChain.invoke({
      dispatchContext: JSON.stringify({
        vehicle: input.vehicle,
        health: input.health,
        faults: input.faults,
        depotRecommendations: input.depotRecommendations,
        technicianRecommendations: input.technicianRecommendations,
        serviceHistory: input.serviceHistory.slice(0, 10),
        partsToStage: input.partsToStage
      }),
      agentTrace: JSON.stringify(agentTrace),
      fewShotExamples: input.fewShotExamples ?? ""
    })

    return {
      ...result,
      agentTrace,
      model: aiConfig.model,
      latencyMs: Date.now() - startedAt
    }
  } catch {
    return heuristicDispatchFallback(input)
  }
}
