import { ChatPromptTemplate } from "@langchain/core/prompts"

import type { AiEscalation, Depot, HealthScore, ServiceRequest, Technician, Vehicle } from "@kaz/shared"

import { aiConfig, canUseAi, createOpenRouterClient } from "./client"
import { escalationSchema } from "./output-schemas"

export type EscalationReasoningInput = {
  vehicles: Vehicle[]
  healthByVehicle: Record<string, HealthScore>
  depots: Depot[]
  technicians: Technician[]
  serviceRequests: ServiceRequest[]
}

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You detect operational escalations in a fleet service system. Return only meaningful escalations for SLA risk, batch patterns, capacity crunch, or rapid degradation."
  ],
  ["human", "EscalationContext: {context}"]
])

const heuristicEscalations = (input: EscalationReasoningInput): AiEscalation[] => {
  const escalations: AiEscalation[] = []
  const overloadedDepots = input.depots.filter((depot) => depot.occupiedBays / Math.max(1, depot.totalBays) >= 0.75)
  if (overloadedDepots.length) {
    escalations.push({
      type: "capacity_crunch",
      severity: "warning",
      title: "Depot capacity crunch",
      description: `${overloadedDepots[0].name} is above 90% bay utilization.`,
      affectedEntities: overloadedDepots.map((depot) => depot.id),
      suggestedAction: "Re-route lower priority work to alternate depots.",
      model: null,
      latencyMs: null
    })
  }
  if (input.serviceRequests.length >= 5) {
    escalations.push({
      type: "sla_risk",
      severity: "warning",
      title: "Open service queue needs review",
      description: `${input.serviceRequests.length} service requests are currently open.`,
      affectedEntities: input.serviceRequests.slice(0, 10).map((request) => request.id),
      suggestedAction: "Review dispatch priority and depot allocation.",
      model: null,
      latencyMs: null
    })
  }
  const criticalVehicles = input.vehicles.filter((vehicle) => input.healthByVehicle[vehicle.id]?.status === "critical")
  if (criticalVehicles.length >= 3) {
    escalations.push({
      type: "rapid_degradation",
      severity: "critical",
      title: "Multiple critical vehicles require review",
      description: `${criticalVehicles.length} vehicles are currently critical.`,
      affectedEntities: criticalVehicles.slice(0, 10).map((vehicle) => vehicle.id),
      suggestedAction: "Escalate triage and consider dispatch override.",
      model: null,
      latencyMs: null
    })
  }
  return escalations
}

export const runEscalationReasoning = async (input: EscalationReasoningInput): Promise<AiEscalation[]> => {
  const startedAt = Date.now()
  if (!canUseAi()) {
    return heuristicEscalations(input)
  }

  try {
    const model = createOpenRouterClient().withStructuredOutput(escalationSchema)
    const chain = prompt.pipe(model)
    const result = await chain.invoke({
      context: JSON.stringify({
        vehicles: input.vehicles,
        healthByVehicle: input.healthByVehicle,
        depots: input.depots,
        technicians: input.technicians,
        serviceRequests: input.serviceRequests
      })
    })

    return result.escalations.map((escalation) => ({
      ...escalation,
      model: aiConfig.model,
      latencyMs: Date.now() - startedAt
    }))
  } catch {
    return heuristicEscalations(input)
  }
}
