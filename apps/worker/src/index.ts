import { createMockState } from "@kaz/oem-adapters-mock"
import { buildPriorityQueue } from "@kaz/orchestration"
import { computeHealthScore } from "@kaz/signal-trust"

const state = createMockState(77)
const healthByVehicle = Object.fromEntries(
  state.vehicles.map((vehicle) => [
    vehicle.id,
    computeHealthScore(state.signals[vehicle.id], state.faults[vehicle.id])
  ])
)

const queue = buildPriorityQueue(state, healthByVehicle).slice(0, 5)

console.log("[worker] phase-one demo worker ready")
for (const entry of queue) {
  console.log(`[worker] ${entry.vehicleId} score=${entry.score} reasons=${entry.breakdown.reasons.join(" | ")}`)
}
