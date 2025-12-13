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

  it("groups multiple items of same type for averaging", () => {
    const decisions = [
      makeDecision({ decisionType: "priority", rewardScore: 0.2 }),
      makeDecision({ decisionType: "priority", rewardScore: 0.8 })
    ]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result).toHaveLength(1)
  })

  it("boundary: avgReward exactly 0.65 triggers outperforming message", () => {
    const decisions = [makeDecision({ decisionType: "priority", rewardScore: 0.65 })]
    const result = buildWeightAdjustmentProposals(decisions)
    expect(result[0].reason).toContain("outperforming baseline")
  })
})

describe("buildLearnedPatterns", () => {
  it("counts patterns by subsystem:actualFault", () => {
    const history = [
      makeHistory({ subsystem: "engine", actualFault: "oil_leak" }),
      makeHistory({ subsystem: "engine", actualFault: "oil_leak" }),
      makeHistory({ subsystem: "brakes", actualFault: "pad_wear" }),
      makeHistory({ subsystem: "brakes", actualFault: "pad_wear" })
    ]
    const result = buildLearnedPatterns(history)
    expect(result).toHaveLength(2)
  })

  it("filters out patterns with count < 2", () => {
    const history = [
      makeHistory({ subsystem: "engine", actualFault: "oil_leak" }),
      makeHistory({ subsystem: "brakes", actualFault: "pad_wear" })
    ]
    expect(buildLearnedPatterns(history)).toHaveLength(0)
  })

  it("skips records without actualFault", () => {
    const history = [
      makeHistory({ actualFault: null }),
      makeHistory({ actualFault: undefined }),
      makeHistory({ subsystem: "engine", actualFault: "oil_leak" }),
      makeHistory({ subsystem: "engine", actualFault: "oil_leak" })
    ]
    const result = buildLearnedPatterns(history)
    expect(result).toHaveLength(1)
    expect(result[0].pattern).toBe("engine:oil_leak")
  })

  it("returns empty array for empty history", () => {
    expect(buildLearnedPatterns([])).toEqual([])
  })

  it("sorts by count descending", () => {
    const history = [
      ...Array.from({ length: 2 }, () => makeHistory({ subsystem: "engine", actualFault: "a" })),
      ...Array.from({ length: 5 }, () => makeHistory({ subsystem: "brakes", actualFault: "b" }))
    ]
    const result = buildLearnedPatterns(history)
    expect(result[0].pattern).toBe("brakes:b")
    expect(result[1].pattern).toBe("engine:a")
  })

  it("limits to 10 patterns", () => {
    const history: ServiceHistoryRecord[] = []
    for (let i = 0; i < 15; i++) {
      history.push(makeHistory({ subsystem: "engine", actualFault: `fault_${i}` }))
      history.push(makeHistory({ subsystem: "engine", actualFault: `fault_${i}` }))
    }
    expect(buildLearnedPatterns(history)).toHaveLength(10)
  })

  it("computes confidence correctly: 0.4 + count * 0.08", () => {
    const history = Array.from({ length: 4 }, () => makeHistory({ subsystem: "engine", actualFault: "x" }))
    const result = buildLearnedPatterns(history)
    expect(result[0].confidence).toBeCloseTo(0.72)
  })

  it("caps confidence at 0.95", () => {
    const history = Array.from({ length: 20 }, () => makeHistory({ subsystem: "engine", actualFault: "x" }))
    const result = buildLearnedPatterns(history)
    expect(result[0].confidence).toBe(0.95)
  })

  it("returns supportingCount", () => {
    const history = Array.from({ length: 3 }, () => makeHistory({ subsystem: "engine", actualFault: "x" }))
    const result = buildLearnedPatterns(history)
    expect(result[0].supportingCount).toBe(3)
  })
})
