import { ChatPromptTemplate } from "@langchain/core/prompts"

import type { AiPriorityAssessment, HealthScore, PriorityEntry, ServiceHistoryRecord, Vehicle, VehicleFault, VehicleSignalSnapshot } from "@kaz/shared"

import { aiConfig, canUseAi, createOpenRouterClient } from "./client"
import { priorityAssessmentSchema } from "./output-schemas"

export type PriorityReasoningInput = {
  vehicle: Vehicle
  signal: VehicleSignalSnapshot
  health: HealthScore
  faults: VehicleFault[]
  heuristic: PriorityEntry
  serviceHistory: ServiceHistoryRecord[]
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a commercial vehicle service prioritization expert. Evaluate the heuristic priority for one vehicle. Use the provided telemetry, health, faults, and service history. Return concise, specific reasoning only."
  ],
  [
    "human",
    "Vehicle: {vehicle}\nSignal: {signal}\nHealth: {health}\nFaults: {faults}\nHeuristic: {heuristic}\nServiceHistory: {serviceHistory}"
  ]
])

export const runPriorityReasoning = async (
  input: PriorityReasoningInput
): Promise<AiPriorityAssessment | null> => {
  if (!canUseAi()) {
    return null
  }

  const startedAt = Date.now()

  try {
    const model = createOpenRouterClient().withStructuredOutput(priorityAssessmentSchema)
    const chain = prompt.pipe(model)
    const result = await chain.invoke({
      vehicle: JSON.stringify(input.vehicle),
      signal: JSON.stringify(input.signal),
      health: JSON.stringify(input.health),
      faults: JSON.stringify(input.faults),
      heuristic: JSON.stringify(input.heuristic),
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
