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
    expect(result[1].label).toBe("worst")
  })

  it("copies decisionType, rewardScore, and summary correctly", () => {
    const decision = makeDecision({ decisionType: "depot", rewardScore: 0.42, summary: "Test summary" })
    const result = buildFewShotExamples([decision], [])
    expect(result[0].decisionType).toBe("depot")
    expect(result[0].rewardScore).toBe(0.42)
    expect(result[0].summary).toBe("Test summary")
  })
})

describe("renderFewShotExamples", () => {
  it("formats examples as pipe-delimited lines", () => {
    const examples: FewShotExample[] = [
      { label: "best", decisionType: "priority", vehicleId: "v-1", rewardScore: 0.85, summary: "Great" }
    ]
    const result = renderFewShotExamples(examples)
    expect(result).toBe("BEST | priority | v-1 | reward=0.85 | Great")
  })

  it("joins multiple examples with newlines", () => {
    const examples: FewShotExample[] = [
      { label: "best", decisionType: "priority", vehicleId: "v-1", rewardScore: 0.9, summary: "A" },
      { label: "worst", decisionType: "depot", vehicleId: "v-2", rewardScore: 0.1, summary: "B" }
    ]
    const lines = renderFewShotExamples(examples).split("\n")
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain("BEST")
    expect(lines[1]).toContain("WORST")
  })

  it("returns empty string for empty array", () => {
    expect(renderFewShotExamples([])).toBe("")
  })

  it("uppercases the label", () => {
    const examples: FewShotExample[] = [
      { label: "worst", decisionType: "dispatch", vehicleId: "v-3", rewardScore: 0.22, summary: "Bad" }
    ]
    expect(renderFewShotExamples(examples)).toContain("WORST")
  })

  it("formats rewardScore to 2 decimal places", () => {
    const examples: FewShotExample[] = [
      { label: "best", decisionType: "priority", vehicleId: "v-1", rewardScore: 0.1, summary: "X" }
    ]
    expect(renderFewShotExamples(examples)).toContain("reward=0.10")
  })
})
