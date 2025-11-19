import { describe, expect, it } from "vitest"

import type { DecisionReviewItem, ServiceHistoryRecord } from "@kaz/shared"

import { buildLearnedPatterns, buildWeightAdjustmentProposals } from "../improvement"

const makeDecision = (overrides: Partial<DecisionReviewItem> = {}): DecisionReviewItem => ({
  decisionLogId: "log-1",
  vehicleId: "v-1",
  decisionType: "priority",
  rewardScore: 0.8,
  createdAt: "2024-01-01",
  summary: "Decision summary",
  ...overrides
})

const makeHistory = (overrides: Partial<ServiceHistoryRecord> = {}): ServiceHistoryRecord => ({
  id: "sh-1",
  vehicleId: "v-1",
  depotId: "d-1",
  technicianId: "t-1",
  subsystem: "engine",
  outcome: "repaired",
  resolvedAt: "2024-01-01",
  firstTimeFix: true,
  actualFault: "oil_leak",
  ...overrides
})

describe("buildWeightAdjustmentProposals", () => {
  it("returns proposals grouped by decision type", () => {
    const decisions = [
      makeDecision({ decisionType: "priority", rewardScore: 0.8 }),
      makeDecision({ decisionType: "depot", rewardScore: 0.3 })
    ]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result).toHaveLength(2)
    expect(result.map((r) => r.decisionType).sort()).toEqual(["depot", "priority"])
  })

  it("uses outperforming message when avgReward >= 0.65", () => {
    const decisions = [
      makeDecision({ decisionType: "priority", rewardScore: 0.8 }),
      makeDecision({ decisionType: "priority", rewardScore: 0.7 })
    ]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result[0].reason).toContain("outperforming baseline")
  })

  it("uses conservative message when avgReward < 0.65", () => {
    const decisions = [
      makeDecision({ decisionType: "priority", rewardScore: 0.3 }),
      makeDecision({ decisionType: "priority", rewardScore: 0.4 })
    ]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result[0].reason).toContain("conservative weighting")
  })

  it("proposes higher weight for high avgReward", () => {
    const decisions = [makeDecision({ decisionType: "priority", rewardScore: 0.9 })]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result[0].proposedWeight).toBeGreaterThan(result[0].currentWeight)
  })

  it("proposes lower weight for low avgReward", () => {
    const decisions = [makeDecision({ decisionType: "priority", rewardScore: 0.1 })]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result[0].proposedWeight).toBeLessThan(result[0].currentWeight)
  })

  it("clamps proposed weight between 0.5 and 1.5", () => {
    const highResult = buildWeightAdjustmentProposals([makeDecision({ rewardScore: 1.0 })])
    const lowResult = buildWeightAdjustmentProposals([makeDecision({ rewardScore: 0.0 })])
    expect(highResult[0].proposedWeight).toBeLessThanOrEqual(1.5)
    expect(lowResult[0].proposedWeight).toBeGreaterThanOrEqual(0.5)
  })

  it("returns empty array for empty input", () => {
    expect(buildWeightAdjustmentProposals([])).toEqual([])
  })

  it("uses default weight 1 for known decision types", () => {
    const result = buildWeightAdjustmentProposals([makeDecision({ decisionType: "priority" })])
    expect(result[0].currentWeight).toBe(1)
  })

  it("uses fallback weight 1 for unknown decision types", () => {
    const result = buildWeightAdjustmentProposals([makeDecision({ decisionType: "unknown_type" })])
    expect(result[0].currentWeight).toBe(1)
  })
