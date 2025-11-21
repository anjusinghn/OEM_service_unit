import { z } from "zod"

export const priorityAssessmentSchema = z.object({
  adjustedScore: z.number().min(0).max(100),
  adjustment: z.number().min(-100).max(100),
  urgency: z.enum(["routine", "elevated", "urgent", "emergency"]),
  riskFactors: z.array(z.string()).max(5),
  recommendation: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
  shouldEscalate: z.boolean()
})

export const depotAssessmentSchema = z.object({
  recommendedDepotId: z.string().min(1),
  reasoning: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
  partsRisk: z.string().nullable(),
  logisticsNote: z.string().nullable()
})

export const dispatchPlanSchema = z.object({
  depotId: z.string().min(1),
  depotReasoning: z.string().min(1),
  partsToStage: z.array(z.string()),
  estimatedRepairHours: z.number().min(0),
  estimatedTotalCost: z.number().min(0),
  urgencyLevel: z.enum(["routine", "elevated", "urgent", "emergency"]),
  watchPoints: z.array(z.string()).max(6),
  alternativePlan: z
    .object({
      depotId: z.string().min(1),
      reasoning: z.string().min(1)
    })
    .nullable(),
  confidence: z.number().min(0).max(1)
})

export const escalationSchema = z.object({
  escalations: z.array(
    z.object({
      type: z.string().min(1),
      severity: z.enum(["info", "warning", "critical"]),
      title: z.string().min(1),
      description: z.string().min(1),
      affectedEntities: z.array(z.string()),
      suggestedAction: z.string().min(1)
    })
  )
})
