import type { ServiceCompletionInput } from "@kaz/shared"

export type RewardComputationInput = {
  completion: ServiceCompletionInput
  priorityDecision: { confidence?: number | null; urgency?: string | null } | null
  depotDecision: { confidence?: number | null } | null
  technicianDecision: { confidence?: number | null } | null
}

export type RewardComputationResult = {
  priority: { rewardScore: number; rewardBreakdown: Record<string, number> }
  depot: { rewardScore: number; rewardBreakdown: Record<string, number> }
  technician: { rewardScore: number; rewardBreakdown: Record<string, number> }
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))

const averageScore = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === "number")
  if (!valid.length) return null
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

export const computeRewardSignals = (input: RewardComputationInput): RewardComputationResult => {
  const diagnosis = input.completion.diagnosisCorrect === true ? 1 : input.completion.diagnosisCorrect === false ? 0 : 0.5
  const firstTimeFix = input.completion.firstTimeFix === true ? 1 : input.completion.firstTimeFix === false ? 0 : 0.5
  const duration = typeof input.completion.repairDuration === "number" ? clamp(1 - input.completion.repairDuration / 12) : 0.5
  const rating = averageScore([input.completion.priorityRating, input.completion.depotRating, input.completion.technicianRating])
  const normalizedRating = rating === null ? 0.5 : clamp(rating / 5)

  return {
    priority: {
      rewardScore: clamp(diagnosis * 0.35 + firstTimeFix * 0.25 + normalizedRating * 0.2 + duration * 0.2),
      rewardBreakdown: {
        diagnosis,
        firstTimeFix,
        rating: normalizedRating,
        duration,
        confidence: input.priorityDecision?.confidence ?? 0
      }
    },
    depot: {
      rewardScore: clamp(firstTimeFix * 0.35 + normalizedRating * 0.35 + duration * 0.3),
      rewardBreakdown: {
        firstTimeFix,
        rating: input.completion.depotRating ? clamp(input.completion.depotRating / 5) : normalizedRating,
        duration,
        confidence: input.depotDecision?.confidence ?? 0
      }
    },
    technician: {
      rewardScore: clamp(diagnosis * 0.25 + firstTimeFix * 0.4 + normalizedRating * 0.2 + duration * 0.15),
      rewardBreakdown: {
        diagnosis,
        firstTimeFix,
        rating: input.completion.technicianRating ? clamp(input.completion.technicianRating / 5) : normalizedRating,
        duration,
        confidence: input.technicianDecision?.confidence ?? 0
      }
    }
  }
}
