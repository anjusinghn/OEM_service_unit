import { closeQueues, enqueueJob, queueNames } from "@kaz/db"
import { applyMockTick, createMockState } from "@kaz/oem-adapters-mock"

const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS ?? 10_000)
const SIMULATOR_STARTUP_DELAY_MS = Number(process.env.SIMULATOR_STARTUP_DELAY_MS ?? 4_000)
const SIMULATOR_SEED = Number(process.env.SIMULATOR_SEED ?? 101)
const SOURCE_ID = process.env.SIMULATOR_SOURCE_ID ?? "mock-oem-demo"

let currentState = createMockState(SIMULATOR_SEED)
let tickHandle: NodeJS.Timeout | null = null
let isShuttingDown = false
let isTickRunning = false

const faultIdsForState = (state: typeof currentState) =>
  Object.fromEntries(
    state.vehicles.map((vehicle) => [
      vehicle.id,
      new Set((state.faults[vehicle.id] ?? []).map((fault) => fault.id))
    ])
)

let previousFaultIds: Record<string, Set<string>> = {}

const enqueueTelemetry = async (state: typeof currentState) => {
  await Promise.all(
    state.vehicles.map((vehicle) =>
      enqueueJob(queueNames.telemetryIngest, {
        vehicleId: vehicle.id,
        snapshot: state.signals[vehicle.id],
        timestamp: state.signals[vehicle.id].timestamp,
        source: SOURCE_ID
      })
    )
  )
}

const enqueueFaultChanges = async (state: typeof currentState) => {
  const jobs = state.vehicles.flatMap((vehicle) => {
    const nextFaults = state.faults[vehicle.id] ?? []
    const nextIds = new Set(nextFaults.map((fault) => fault.id))
    const previousIds = previousFaultIds[vehicle.id] ?? new Set<string>()
    const changed = nextIds.size !== previousIds.size || [...nextIds].some((id) => !previousIds.has(id))

    if (!changed) return []

    if (nextFaults.length === 0) {
      return [
        enqueueJob(queueNames.faultEvents, {
          vehicleId: vehicle.id,
          kind: "clear",
          timestamp: new Date().toISOString(),
          source: SOURCE_ID
        })
      ]
    }

    return nextFaults.map((fault) =>
      enqueueJob(queueNames.faultEvents, {
        vehicleId: vehicle.id,
        kind: "upsert",
        fault,
        timestamp: fault.occurredAt,
        source: SOURCE_ID
      })
