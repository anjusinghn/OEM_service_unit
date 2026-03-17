import type { Job } from "bullmq"

import { computeRewardSignals } from "@kaz/ai"
import { prisma, rewardSignalRepository, queueNames, type QueuePayloadMap } from "@kaz/db"

const getConfidence = (value: unknown): number | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const confidence = (value as { confidence?: unknown }).confidence
  return typeof confidence === "number" ? confidence : null
}

export const processRewardCompute = async (job: Job<QueuePayloadMap[typeof queueNames.rewardCompute]>) => {
  const { serviceRequestId, vehicleId, depotRating, technicianRating, priorityRating } = job.data

  const [serviceHistory, decisionLogs] = await Promise.all([
    prisma.serviceHistory.findFirst({ where: { vehicleId }, orderBy: { resolvedAt: "desc" } }),
    prisma.aiDecisionLog.findMany({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ])

  if (!serviceHistory) {
    return { serviceRequestId, skipped: true }
  }

  const priorityDecision = decisionLogs.find((log) => log.decisionType === "priority")
  const depotDecision = decisionLogs.find((log) => log.decisionType === "depot")
  const technicianDecision = decisionLogs.find((log) => log.decisionType === "technician")

  const rewards = computeRewardSignals({
    completion: {
      actualFault: serviceHistory.actualFault,
      diagnosisCorrect: serviceHistory.diagnosisCorrect,
      partsUsed: Array.isArray(serviceHistory.partsUsed) ? serviceHistory.partsUsed.filter((value): value is string => typeof value === "string") : [],
      repairDuration: serviceHistory.repairDuration,
      technicianNotes: serviceHistory.technicianNotes,
      firstTimeFix: serviceHistory.firstTimeFix,
      depotRating: depotRating ?? null,
      technicianRating: technicianRating ?? null,
      priorityRating: priorityRating ?? null
    },
    priorityDecision: priorityDecision ? { confidence: getConfidence(priorityDecision.aiOutput) } : null,
    depotDecision: depotDecision ? { confidence: getConfidence(depotDecision.aiOutput) } : null,
    technicianDecision: technicianDecision ? { confidence: getConfidence(technicianDecision.aiOutput) } : null
  })

  if (priorityDecision) {
    await rewardSignalRepository.create({
      aiDecisionLogId: priorityDecision.id,
      rewardType: "priority",
      rewardScore: rewards.priority.rewardScore,
      rewardBreakdown: rewards.priority.rewardBreakdown
    })
  }

  if (depotDecision) {
    await rewardSignalRepository.create({
      aiDecisionLogId: depotDecision.id,
      rewardType: "depot",
      rewardScore: rewards.depot.rewardScore,
      rewardBreakdown: rewards.depot.rewardBreakdown
    })
  }

  if (technicianDecision) {
    await rewardSignalRepository.create({
      aiDecisionLogId: technicianDecision.id,
      rewardType: "technician",
      rewardScore: rewards.technician.rewardScore,
      rewardBreakdown: rewards.technician.rewardBreakdown
    })
  }

  return { serviceRequestId, vehicleId, rewards }
}
