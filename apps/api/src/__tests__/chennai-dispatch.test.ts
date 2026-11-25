import { describe, expect, it } from "vitest"
import type { AiDispatchPlan, DepotRecommendation, HealthScore } from "@kaz/shared"

import { buildChennaiDispatchPlan } from "../chennai-dispatch"

const candidate: DepotRecommendation = {
  depotId: "chennai-madhavaram", score: 75, etaHours: 0.5, distanceKm: 16, capacityOpen: 1,
  specialtyMatch: true, partsReady: true, reasons: ["Pump in stock"],
  requiredParts: [{ partNumber: "COOL-PUMP-04", name: "Coolant circulation pump", subsystem: "cooling", price: 4000, leadDays: 1 }],
  schedule: { technicianId: "tech", travelMinutes: 30, partsReadyMinutes: 0, bayReadyMinutes: 0, technicianReadyMinutes: 0, repairMinutes: 75, returnToServiceMinutes: 105 }
}
const health = { status: "critical" } as HealthScore

describe("Chennai dispatch", () => {
  it("returns a deterministic plan when the model proposes an unverified workshop or parts", async () => {
    const baseline = await buildChennaiDispatchPlan([candidate], health)
    expect(baseline).toMatchObject({ depotId: candidate.depotId, model: null, estimatedRepairHours: 1.25 })
    const invalid = { ...baseline, depotId: "unknown", partsToStage: [], model: "fake" } as AiDispatchPlan
    expect(await buildChennaiDispatchPlan([candidate], health, async () => invalid)).toEqual(baseline)
  })

  it("uses the same fallback when the model rejects or exceeds the deadline", async () => {
    const baseline = await buildChennaiDispatchPlan([candidate], health)
    expect(await buildChennaiDispatchPlan([candidate], health, async () => { throw new Error("offline") })).toEqual(baseline)
    expect(await buildChennaiDispatchPlan([candidate], health, () => new Promise(() => {}), 1)).toEqual(baseline)
    expect(await buildChennaiDispatchPlan([], health)).toBeNull()
  })
})
