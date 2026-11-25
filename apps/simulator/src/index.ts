import { closeQueues, enqueueJob, queueNames } from "@kaz/db"
import { applyMockTick, createMockState } from "@kaz/oem-adapters-mock"
import { CHENNAI_SCENARIO } from "@kaz/shared"

import { createChennaiSimulator } from "./chennai.js"

const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS ?? 10_000)
const SIMULATOR_STARTUP_DELAY_MS = Number(process.env.SIMULATOR_STARTUP_DELAY_MS ?? 4_000)
const SIMULATOR_SEED = Number(process.env.SIMULATOR_SEED ?? 101)
const SOURCE_ID = process.env.SIMULATOR_SOURCE_ID ?? "mock-oem-demo"

const chennaiTick = process.env.SIMULATION_SCENARIO === CHENNAI_SCENARIO
  ? createChennaiSimulator(TICK_INTERVAL_MS, SIMULATOR_SEED) : undefined
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
    )
  })

  await Promise.all(jobs)
  previousFaultIds = faultIdsForState(state)
}

const runTick = async (initial = false) => {
  if (isTickRunning || isShuttingDown) return
  isTickRunning = true

  try {
    if (chennaiTick) {
      await chennaiTick()
      return
    }
    if (!initial) {
      currentState = applyMockTick(currentState)
    }

    await enqueueTelemetry(currentState)
    await enqueueFaultChanges(currentState)

    console.log(
      `[simulator] tick=${initial ? "bootstrap" : "update"} vehicles=${currentState.vehicles.length} activeFaults=${Object.values(currentState.faults).flat().length}`
    )
  } catch (error) {
    console.error("[simulator] tick failed", error)
  } finally {
    isTickRunning = false
  }
}

const shutdown = async (signal: string) => {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`[simulator] shutting down on ${signal}`)
  if (tickHandle) {
    clearInterval(tickHandle)
    tickHandle = null
  }

  await closeQueues()
  process.exit(0)
}

console.log("[simulator] continuous simulator ready")
console.log(chennaiTick ? "[simulator] Greater Chennai scenario" :
  `[simulator] vehicles=${currentState.vehicles.length} depots=${currentState.depots.length} technicians=${currentState.technicians.length}`)
console.log(`[simulator] intervalMs=${TICK_INTERVAL_MS} source=${chennaiTick ? CHENNAI_SCENARIO : SOURCE_ID}`)
console.log(`[simulator] startupDelayMs=${SIMULATOR_STARTUP_DELAY_MS}`)

setTimeout(() => {
  void runTick(true)
}, SIMULATOR_STARTUP_DELAY_MS)

tickHandle = setInterval(() => {
  void runTick(false)
}, TICK_INTERVAL_MS)

process.on("SIGINT", () => {
  void shutdown("SIGINT")
})

process.on("SIGTERM", () => {
  void shutdown("SIGTERM")
})
