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

  const request = await prisma.serviceRequest.findUnique({ where: { id: serviceRequestId } })
  if (!request) {
    return { serviceRequestId, skipped: true }
  }

  const [serviceHistory, decisionLogs] = await Promise.all([
    prisma.serviceHistory.findFirst({
      where: { vehicleId, resolvedAt: { gte: request.createdAt } },
      orderBy: { resolvedAt: "asc" }
    }),
    prisma.aiDecisionLog.findMany({
      where: { vehicleId, createdAt: { gte: request.createdAt } },
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
