import { ChatPromptTemplate } from "@langchain/core/prompts"

import type { AiDepotAssessment, DepotRecommendation, HealthScore, ServiceHistoryRecord, Vehicle, VehicleFault } from "@kaz/shared"

import { aiConfig, canUseAi, createOpenRouterClient } from "./client"
import { depotAssessmentSchema } from "./output-schemas"

export type DepotReasoningInput = {
  vehicle: Vehicle
  health: HealthScore
  faults: VehicleFault[]
  heuristicRecommendations: DepotRecommendation[]
  serviceHistory: ServiceHistoryRecord[]
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You evaluate depot assignment for commercial vehicle service. Pick the best depot from the heuristic recommendations and explain any logistics or parts risk concisely."
  ],
  [
    "human",
    "Vehicle: {vehicle}\nHealth: {health}\nFaults: {faults}\nHeuristicDepotRecommendations: {recommendations}\nServiceHistory: {serviceHistory}"
  ]
])

export const runDepotReasoning = async (input: DepotReasoningInput): Promise<AiDepotAssessment | null> => {
  if (!canUseAi()) return null

  const startedAt = Date.now()
  try {
    const model = createOpenRouterClient().withStructuredOutput(depotAssessmentSchema)
    const chain = prompt.pipe(model)
    const result = await chain.invoke({
      vehicle: JSON.stringify(input.vehicle),
      health: JSON.stringify(input.health),
      faults: JSON.stringify(input.faults),
      recommendations: JSON.stringify(input.heuristicRecommendations),
      serviceHistory: JSON.stringify(input.serviceHistory.slice(0, 10))
    })

    return {
      ...result,
      model: aiConfig.model,
      latencyMs: Date.now() - startedAt
    }
  } catch {
    return null
  }
}
