import { setTimeout as delay } from "node:timers/promises"

import type { AiDispatchPlan, DepotRecommendation, HealthScore } from "@kaz/shared"

export async function buildChennaiDispatchPlan(
  candidates: DepotRecommendation[],
  health: HealthScore,
  propose?: () => Promise<AiDispatchPlan>,
  timeoutMs = 12_000
): Promise<AiDispatchPlan | null> {
  const [recommended, alternative] = candidates
  if (!recommended?.schedule) return null

  let proposal: AiDispatchPlan | undefined
  if (propose) {
    const timer = new AbortController()
    try {
      proposal = await Promise.race([
        propose(),
        delay(timeoutMs, undefined, { signal: timer.signal })
      ])
    } catch {
      proposal = undefined
    } finally {
      timer.abort()
    }
  }

  const parts = recommended.requiredParts.map((part) => part.partNumber)
  const verified = proposal?.model && proposal.depotId === recommended.depotId &&
    proposal.partsToStage.length === parts.length && parts.every((part) => proposal.partsToStage.includes(part))
    ? proposal : undefined

  return {
    candidates,
    depotId: recommended.depotId,
    depotReasoning: recommended.reasons.join(". ") + ".",
    partsToStage: parts,
    estimatedRepairHours: recommended.schedule.repairMinutes / 60,
    estimatedTotalCost: recommended.requiredParts.reduce((total, part) => total + part.price, 0),
    urgencyLevel: health.status === "critical" ? "urgent" : "elevated",
    watchPoints: recommended.partsReady ? [] : ["Confirm the part arrival before starting service."],
    alternativePlan: alternative ? { depotId: alternative.depotId, reasoning: alternative.reasons.join(". ") + "." } : null,
    confidence: verified?.confidence ?? 0.5,
    agentTrace: verified?.agentTrace ?? ["Ranked feasible workshops by estimated return to service"],
    model: verified?.model ?? null,
    latencyMs: verified?.latencyMs ?? null
  }
}
