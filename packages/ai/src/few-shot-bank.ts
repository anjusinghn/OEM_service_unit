import type { DecisionReviewItem, FewShotExample } from "@kaz/shared"

export const buildFewShotExamples = (
  bestDecisions: DecisionReviewItem[],
  worstDecisions: DecisionReviewItem[]
): FewShotExample[] => {
  const positive = bestDecisions.slice(0, 3).map((decision) => ({
    label: "best",
    decisionType: decision.decisionType,
    vehicleId: decision.vehicleId,
    rewardScore: decision.rewardScore,
    summary: decision.summary
  }))

  const negative = worstDecisions.slice(0, 3).map((decision) => ({
    label: "worst",
    decisionType: decision.decisionType,
    vehicleId: decision.vehicleId,
    rewardScore: decision.rewardScore,
    summary: decision.summary
  }))

  return [...positive, ...negative]
}

export const renderFewShotExamples = (examples: FewShotExample[]): string =>
  examples
    .map((example) => `${example.label.toUpperCase()} | ${example.decisionType} | ${example.vehicleId} | reward=${example.rewardScore.toFixed(2)} | ${example.summary}`)
    .join("\n")
