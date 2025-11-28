import { describe, expect, it } from "vitest"

import type { DecisionReviewItem, FewShotExample } from "@kaz/shared"

import { buildFewShotExamples, renderFewShotExamples } from "../few-shot-bank"

const makeDecision = (overrides: Partial<DecisionReviewItem> = {}): DecisionReviewItem => ({
  decisionLogId: "log-1",
  vehicleId: "v-1",
  decisionType: "priority",
  rewardScore: 0.8,
  createdAt: "2024-01-01",
  summary: "Good decision",
  ...overrides
})

describe("buildFewShotExamples", () => {
  it("maps best decisions with label 'best'", () => {
    const best = [makeDecision({ vehicleId: "v-1" })]
    const result = buildFewShotExamples(best, [])
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe("best")
    expect(result[0].vehicleId).toBe("v-1")
  })

  it("maps worst decisions with label 'worst'", () => {
    const worst = [makeDecision({ vehicleId: "v-2", rewardScore: 0.1 })]
    const result = buildFewShotExamples([], worst)
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe("worst")
  })

  it("slices to max 3 best and 3 worst", () => {
    const best = Array.from({ length: 5 }, (_, i) => makeDecision({ decisionLogId: `best-${i}` }))
    const worst = Array.from({ length: 5 }, (_, i) => makeDecision({ decisionLogId: `worst-${i}` }))
    const result = buildFewShotExamples(best, worst)
    expect(result).toHaveLength(6)
    expect(result.filter((e) => e.label === "best")).toHaveLength(3)
    expect(result.filter((e) => e.label === "worst")).toHaveLength(3)
  })

  it("returns empty array for empty inputs", () => {
    expect(buildFewShotExamples([], [])).toEqual([])
  })

  it("preserves positive-first ordering", () => {
    const best = [makeDecision({ vehicleId: "best-v" })]
    const worst = [makeDecision({ vehicleId: "worst-v" })]
    const result = buildFewShotExamples(best, worst)
    expect(result[0].label).toBe("best")
