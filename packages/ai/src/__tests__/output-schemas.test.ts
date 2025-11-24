import { describe, expect, it } from "vitest"

import {
  depotAssessmentSchema,
  dispatchPlanSchema,
  escalationSchema,
  priorityAssessmentSchema
} from "../output-schemas"

describe("priorityAssessmentSchema", () => {
  const valid = {
    adjustedScore: 75,
    adjustment: 10,
    urgency: "urgent",
    riskFactors: ["brake wear"],
    recommendation: "Immediate service required",
    confidence: 0.85,
    shouldEscalate: true
  }

  it("parses valid data", () => {
    expect(priorityAssessmentSchema.parse(valid)).toEqual(valid)
  })

  it("rejects adjustedScore > 100", () => {
    expect(() => priorityAssessmentSchema.parse({ ...valid, adjustedScore: 101 })).toThrow()
  })

  it("rejects adjustedScore < 0", () => {
    expect(() => priorityAssessmentSchema.parse({ ...valid, adjustedScore: -1 })).toThrow()
  })

  it("rejects invalid urgency enum", () => {
    expect(() => priorityAssessmentSchema.parse({ ...valid, urgency: "unknown" })).toThrow()
  })

  it("accepts all valid urgency values", () => {
    for (const urgency of ["routine", "elevated", "urgent", "emergency"]) {
      expect(() => priorityAssessmentSchema.parse({ ...valid, urgency })).not.toThrow()
    }
  })

  it("rejects confidence > 1", () => {
    expect(() => priorityAssessmentSchema.parse({ ...valid, confidence: 1.5 })).toThrow()
  })

  it("rejects confidence < 0", () => {
    expect(() => priorityAssessmentSchema.parse({ ...valid, confidence: -0.1 })).toThrow()
  })

  it("rejects riskFactors exceeding max 5", () => {
    expect(() =>
      priorityAssessmentSchema.parse({ ...valid, riskFactors: ["a", "b", "c", "d", "e", "f"] })
    ).toThrow()
  })

  it("rejects empty recommendation", () => {
    expect(() => priorityAssessmentSchema.parse({ ...valid, recommendation: "" })).toThrow()
  })

  it("accepts boundary values", () => {
    const boundary = { ...valid, adjustedScore: 0, adjustment: -100, confidence: 0 }
    expect(() => priorityAssessmentSchema.parse(boundary)).not.toThrow()
  })
})

describe("depotAssessmentSchema", () => {
  const valid = {
    recommendedDepotId: "depot-1",
    reasoning: "Close proximity",
    confidence: 0.9,
    partsRisk: null,
    logisticsNote: null
  }

  it("parses valid data", () => {
    expect(depotAssessmentSchema.parse(valid)).toEqual(valid)
  })

  it("accepts string values for nullable fields", () => {
    const withValues = { ...valid, partsRisk: "Low stock", logisticsNote: "Road works" }
    expect(depotAssessmentSchema.parse(withValues)).toEqual(withValues)
  })

  it("rejects empty recommendedDepotId", () => {
    expect(() => depotAssessmentSchema.parse({ ...valid, recommendedDepotId: "" })).toThrow()
  })

  it("rejects empty reasoning", () => {
    expect(() => depotAssessmentSchema.parse({ ...valid, reasoning: "" })).toThrow()
  })
})

describe("dispatchPlanSchema", () => {
  const valid = {
    depotId: "depot-1",
