import type { DecisionReviewItem, LearnedPattern, ServiceHistoryRecord, WeightAdjustmentProposal } from "@kaz/shared"

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export const buildWeightAdjustmentProposals = (decisions: DecisionReviewItem[]): WeightAdjustmentProposal[] => {
  const byType = new Map<string, DecisionReviewItem[]>()
  for (const decision of decisions) {
    const list = byType.get(decision.decisionType) ?? []
    list.push(decision)
    byType.set(decision.decisionType, list)
  }

  const currentWeights: Record<string, number> = {
    priority: 1,
    depot: 1,
    technician: 1,
    dispatch: 1
  }

  return [...byType.entries()].map(([decisionType, items]) => {
    const avgReward = items.reduce((sum, item) => sum + item.rewardScore, 0) / Math.max(1, items.length)
    const currentWeight = currentWeights[decisionType] ?? 1
    const proposedWeight = clamp(currentWeight + (avgReward - 0.5) * 0.4, 0.5, 1.5)
    return {
      decisionType,
      currentWeight,
      proposedWeight,
      reason: avgReward >= 0.65
        ? `${decisionType} decisions are outperforming baseline and can be weighted slightly higher.`
        : `${decisionType} decisions need conservative weighting until outcomes improve.`
    }
  })
}

export const buildLearnedPatterns = (history: ServiceHistoryRecord[]): LearnedPattern[] => {
  const patternCounts = new Map<string, number>()
  for (const record of history) {
    if (!record.actualFault) continue
    const key = `${record.subsystem}:${record.actualFault}`
    patternCounts.set(key, (patternCounts.get(key) ?? 0) + 1)
  }

  return [...patternCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pattern, supportingCount]) => ({
      pattern,
      confidence: clamp(0.4 + supportingCount * 0.08, 0, 0.95),
      supportingCount
    }))
}
