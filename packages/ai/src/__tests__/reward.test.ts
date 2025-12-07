import { describe, expect, it } from "vitest"

import type { RewardComputationInput } from "../reward"
import { computeRewardSignals } from "../reward"

const baseCompletion = {
  actualFault: null,
  diagnosisCorrect: null,
  partsUsed: [],
  repairDuration: null,
  technicianNotes: null,
  firstTimeFix: null,
  depotRating: null,
  technicianRating: null,
  priorityRating: null
}

const baseInput: RewardComputationInput = {
  completion: baseCompletion,
  priorityDecision: null,
  depotDecision: null,
  technicianDecision: null
}

describe("computeRewardSignals", () => {
  it("returns baseline scores when all fields are null", () => {
    const result = computeRewardSignals(baseInput)
    expect(result.priority.rewardScore).toBeGreaterThanOrEqual(0)
    expect(result.priority.rewardScore).toBeLessThanOrEqual(1)
    expect(result.depot.rewardScore).toBeGreaterThanOrEqual(0)
    expect(result.technician.rewardScore).toBeGreaterThanOrEqual(0)
  })

  it("handles diagnosisCorrect true → diagnosis = 1", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, diagnosisCorrect: true } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.diagnosis).toBe(1)
    expect(result.technician.rewardBreakdown.diagnosis).toBe(1)
  })

  it("handles diagnosisCorrect false → diagnosis = 0", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, diagnosisCorrect: false } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.diagnosis).toBe(0)
    expect(result.technician.rewardBreakdown.diagnosis).toBe(0)
  })

  it("handles diagnosisCorrect null → diagnosis = 0.5", () => {
    const result = computeRewardSignals(baseInput)
    expect(result.priority.rewardBreakdown.diagnosis).toBe(0.5)
  })

  it("handles firstTimeFix true → 1", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, firstTimeFix: true } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.firstTimeFix).toBe(1)
    expect(result.depot.rewardBreakdown.firstTimeFix).toBe(1)
    expect(result.technician.rewardBreakdown.firstTimeFix).toBe(1)
  })

  it("handles firstTimeFix false → 0", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, firstTimeFix: false } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.firstTimeFix).toBe(0)
  })

  it("handles firstTimeFix null → 0.5", () => {
    const result = computeRewardSignals(baseInput)
    expect(result.priority.rewardBreakdown.firstTimeFix).toBe(0.5)
  })

  it("handles repairDuration present", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, repairDuration: 6 } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.duration).toBe(0.5)
  })

  it("handles repairDuration null → 0.5", () => {
    const result = computeRewardSignals(baseInput)
    expect(result.priority.rewardBreakdown.duration).toBe(0.5)
  })

  it("handles repairDuration 0 → duration = 1", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, repairDuration: 0 } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.duration).toBe(1)
  })

  it("clamps repairDuration > 12 to 0", () => {
    const input: RewardComputationInput = { ...baseInput, completion: { ...baseCompletion, repairDuration: 24 } }
    const result = computeRewardSignals(input)
    expect(result.priority.rewardBreakdown.duration).toBe(0)
  })

  it("handles individual ratings present → specific rating per area", () => {
    const input: RewardComputationInput = {
      ...baseInput,
      completion: { ...baseCompletion, priorityRating: 4, depotRating: 5, technicianRating: 3 }
    }
