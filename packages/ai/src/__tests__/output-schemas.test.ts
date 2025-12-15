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
    depotReasoning: "Best fit",
    partsToStage: ["part-A"],
    estimatedRepairHours: 4,
    estimatedTotalCost: 5000,
    urgencyLevel: "elevated",
    watchPoints: ["Check turbo"],
    alternativePlan: null,
    confidence: 0.8
  }

  it("parses valid data", () => {
    expect(dispatchPlanSchema.parse(valid)).toEqual(valid)
  })

  it("parses with alternativePlan present", () => {
    const withAlt = {
      ...valid,
      alternativePlan: { depotId: "depot-2", reasoning: "Backup plan" }
    }
    expect(dispatchPlanSchema.parse(withAlt)).toEqual(withAlt)
  })

  it("rejects watchPoints exceeding max 6", () => {
    expect(() =>
      dispatchPlanSchema.parse({ ...valid, watchPoints: ["a", "b", "c", "d", "e", "f", "g"] })
    ).toThrow()
  })

  it("rejects invalid urgencyLevel", () => {
    expect(() => dispatchPlanSchema.parse({ ...valid, urgencyLevel: "panic" })).toThrow()
  })

  it("accepts all valid urgencyLevel values", () => {
    for (const urgencyLevel of ["routine", "elevated", "urgent", "emergency"]) {
      expect(() => dispatchPlanSchema.parse({ ...valid, urgencyLevel })).not.toThrow()
    }
  })

  it("rejects negative estimatedRepairHours", () => {
    expect(() => dispatchPlanSchema.parse({ ...valid, estimatedRepairHours: -1 })).toThrow()
  })

  it("rejects negative estimatedTotalCost", () => {
    expect(() => dispatchPlanSchema.parse({ ...valid, estimatedTotalCost: -1 })).toThrow()
  })
})

describe("escalationSchema", () => {
  const valid = {
    escalations: [
      {
        type: "capacity_crunch",
        severity: "warning",
        title: "Depot overloaded",
        description: "Bay utilization above 90%",
        affectedEntities: ["depot-1"],
        suggestedAction: "Re-route work"
      }
    ]
  }

  it("parses valid data", () => {
    expect(escalationSchema.parse(valid)).toEqual(valid)
  })

  it("accepts empty escalations array", () => {
    expect(escalationSchema.parse({ escalations: [] })).toEqual({ escalations: [] })
  })

  it("rejects invalid severity", () => {
    expect(() =>
      escalationSchema.parse({
        escalations: [{ ...valid.escalations[0], severity: "extreme" }]
      })
    ).toThrow()
  })

  it("accepts all valid severity values", () => {
    for (const severity of ["info", "warning", "critical"]) {
      expect(() =>
        escalationSchema.parse({
          escalations: [{ ...valid.escalations[0], severity }]
        })
      ).not.toThrow()
    }
  })

  it("rejects empty type", () => {
    expect(() =>
      escalationSchema.parse({
        escalations: [{ ...valid.escalations[0], type: "" }]
      })
    ).toThrow()
  })
})
