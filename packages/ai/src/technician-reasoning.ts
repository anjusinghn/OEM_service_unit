import { ChatPromptTemplate } from "@langchain/core/prompts"

import type { AiTechnicianAssessment, HealthScore, ServiceHistoryRecord, TechnicianRecommendation, Vehicle, VehicleFault } from "@kaz/shared"

import { aiConfig, canUseAi, createOpenRouterClient } from "./client"
import { technicianAssessmentSchema } from "./output-schemas"

export type TechnicianReasoningInput = {
  vehicle: Vehicle
  health: HealthScore
  faults: VehicleFault[]
  heuristicRecommendations: TechnicianRecommendation[]
  serviceHistory: ServiceHistoryRecord[]
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You evaluate technician assignment for commercial vehicle service. Pick the best technician from the heuristic recommendations and highlight any skill gap or expected repair time."
  ],
  [
    "human",
    "Vehicle: {vehicle}\nHealth: {health}\nFaults: {faults}\nHeuristicTechnicianRecommendations: {recommendations}\nServiceHistory: {serviceHistory}"
  ]
])

export const runTechnicianReasoning = async (input: TechnicianReasoningInput): Promise<AiTechnicianAssessment | null> => {
  if (!canUseAi()) return null

  const startedAt = Date.now()
  try {
    const model = createOpenRouterClient().withStructuredOutput(technicianAssessmentSchema)
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
