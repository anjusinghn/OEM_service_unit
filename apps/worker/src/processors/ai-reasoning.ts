import type { Job } from "bullmq"

import {
  runDepotReasoning,
  runEscalationReasoning,
  runPriorityReasoning
} from "@kaz/ai"
import {
  cacheRepository,
  enqueueJob,
  prisma,
  queueNames,
  type Prisma,
  type QueuePayloadMap
} from "@kaz/db"
import { recommendDepots } from "@kaz/orchestration"

import { loadOperationalState } from "../state-loader.js"

const toJsonValue = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue

const priorityHeuristic = async (vehicleId: string) => {
  const priorityEntry = await prisma.priorityEntry.findUnique({ where: { vehicleId } })
  if (!priorityEntry) return null

  return {
    vehicleId,
    score: priorityEntry.score,
    status: priorityEntry.status as "healthy" | "watch" | "critical",
    breakdown: {
      safetyUrgency: priorityEntry.safetyUrgency,
      failureProximity: priorityEntry.failureProximity,
      businessImpact: priorityEntry.businessImpact,
      downtimeCost: priorityEntry.downtimeCost,
      serviceWindow: priorityEntry.serviceWindow,
      reasons: Array.isArray(priorityEntry.reasons) ? priorityEntry.reasons.filter((value): value is string => typeof value === "string") : []
    }
  }
}

export const processAiReasoning = async (job: Job<QueuePayloadMap[typeof queueNames.aiReasoning]>) => {
  const { decisionType, vehicleId, timestamp } = job.data
  const { state, healthByVehicle } = await loadOperationalState()

  if (decisionType === "escalation") {
    const escalations = await runEscalationReasoning({
      vehicles: state.vehicles,
      healthByVehicle,
      depots: state.depots,
      technicians: state.technicians,
      serviceRequests: state.serviceRequests
    })

    for (const escalation of escalations) {
      const entityVehicleId = escalation.affectedEntities.find((entityId) => state.vehicles.some((vehicle) => vehicle.id === entityId))
      if (!entityVehicleId) continue

      await prisma.aiDecisionLog.create({
        data: {
          vehicleId: entityVehicleId,
          decisionType: "escalation",
          heuristicOutput: toJsonValue({ type: escalation.type }),
          aiOutput: toJsonValue(escalation),
          finalDecision: toJsonValue(escalation),
          modelName: escalation.model,
          latencyMs: escalation.latencyMs
        }
      })
    }

    if (escalations.length) {
      await enqueueJob(queueNames.notifications, {
        type: "service_update",
        payload: {
          aiEscalations: escalations,
          source: "ai-escalation"
        },
        timestamp
      })
    }

    return { decisionType, count: escalations.length }
  }

  if (!vehicleId) {
    return { decisionType, skipped: true }
  }

  const vehicle = state.vehicles.find((item) => item.id === vehicleId)
  const signal = state.signals[vehicleId]
  const health = healthByVehicle[vehicleId]
