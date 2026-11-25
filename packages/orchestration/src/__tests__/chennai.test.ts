import { describe, expect, it } from "vitest"
import {
  chennaiFrame, chennaiInventory, chennaiParts, chennaiTechnicians, chennaiVehicles, chennaiWorkshops,
  type DemoState
} from "@kaz/shared"
import { computeHealthScore } from "@kaz/signal-trust"

import { buildPriorityQueue, recommendDepots } from "../index"

const now = new Date("2026-01-01T00:00:00Z")
const testState = (partInStock = false): DemoState => {
  const frames = chennaiVehicles.map((_, index) => chennaiFrame(index, 8, 101, now))
  return {
    vehicles: chennaiVehicles.map((vehicle, index) => ({ ...vehicle, coordinates: frames[index].coordinates })),
    signals: Object.fromEntries(frames.map((frame) => [frame.signal.vehicleId, frame.signal])),
    faults: Object.fromEntries(frames.map((frame) => [frame.signal.vehicleId, frame.fault ? [frame.fault] : []])),
    depots: chennaiWorkshops, parts: chennaiParts, inventory: chennaiInventory(partInStock),
    technicians: chennaiTechnicians, serviceRequests: [], serviceHistory: [], livePulse: [], suppliers: [],
    forensics: { cohorts: [], anomalies: [], patterns: [], investigations: [], supplierScorecards: [], heatmapData: [] }
  }
}

describe("Greater Chennai simulation", () => {
  it("keeps readings bounded across 1,000 ticks and prioritizes the scripted truck", () => {
    let previousMileage = 0
    for (let tick = 0; tick < 1000; tick++) {
      const frame = chennaiFrame(0, tick, 101, new Date(now.getTime() + tick * 10000))
      const { signal } = frame
      expect(signal.coolantTemp).toBeGreaterThanOrEqual(86)
      expect(signal.coolantTemp).toBeLessThanOrEqual(118)
      expect(signal.oilPressure).toBeGreaterThan(40)
      expect(signal.brakeWear).toBeLessThan(35)
      expect(signal.mileage).toBeGreaterThanOrEqual(previousMileage)
      expect(frame.coordinates.lng).toBeGreaterThan(79.9)
      expect(frame.coordinates.lng).toBeLessThan(80.1)
      previousMileage = signal.mileage
    }
    expect(chennaiFrame(0, 3, 101, now)).toEqual(chennaiFrame(0, 3, 101, now))
    expect(chennaiFrame(0, 3, 101, now).fault?.severity).toBe("warning")

    const state = testState()
    const health = Object.fromEntries(state.vehicles.map(({ id }) => [id, computeHealthScore(state.signals[id], state.faults[id])]))
    expect(Object.values(health).filter((score) => score.status === "healthy")).toHaveLength(11)
    expect(buildPriorityQueue(state, health)[0]).toMatchObject({ vehicleId: "chennai-truck-01", status: "critical" })
  })

  it("changes the winner when the nearby workshop gets the pump and reports no match without capacity", () => {
    const withoutPart = testState()
    const withPart = testState(true)
    expect(recommendDepots(withoutPart.vehicles[0], withoutPart, "cooling")[0].depotId).toBe("chennai-madhavaram")
    expect(recommendDepots(withPart.vehicles[0], withPart, "cooling")[0].depotId).toBe("chennai-poonamallee")
    withPart.depots = withPart.depots.map((depot) => ({ ...depot, occupiedBays: depot.totalBays }))
    expect(recommendDepots(withPart.vehicles[0], withPart, "cooling")).toEqual([])
  })
})
