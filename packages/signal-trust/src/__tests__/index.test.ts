import type { VehicleFault, VehicleSignalSnapshot } from "@kaz/shared"
import { describe, expect, it } from "vitest"

import { computeHealthScore, dedupeAlerts } from "../index"

const createSnapshot = (overrides: Partial<VehicleSignalSnapshot> = {}): VehicleSignalSnapshot => ({
  vehicleId: "veh-001",
  timestamp: "2026-03-18T10:00:00.000Z",
  coolantTemp: 88,
  oilPressure: 48,
  batteryVoltage: 13.4,
  turboBoost: 1.7,
  brakeWear: 32,
  exhaustTemp: 370,
  fuelLevel: 62,
  speed: 58,
  mileage: 142000,
  ...overrides
})

const createFault = (overrides: Partial<VehicleFault> = {}): VehicleFault => ({
  id: "fault-001",
  vehicleId: "veh-001",
  dtcCode: "C1234",
  subsystem: "brakes",
  severity: "critical",
  title: "Brake wear threshold exceeded",
  description: "Brake pad wear is approaching unsafe limits.",
  occurredAt: "2026-03-18T09:00:00.000Z",
  occurrences: 2,
  ...overrides
})

describe("computeHealthScore", () => {
  it("returns a healthy improving score for clean signals", () => {
    const result = computeHealthScore(createSnapshot(), [])

    expect(result).toEqual({
      overall: 99,
      signalQuality: 99,
      trend: "improving",
      status: "healthy",
      weakestSubsystem: "engine",
      subsystems: {
        engine: 99,
        cooling: 99,
        brakes: 99,
        electrical: 99,
        exhaust: 99,
        turbo: 99,
        fuel: 99,
        transmission: 99
      }
    })
  })

  it("returns a watch score with a stable trend for moderate degradation without faults", () => {
    const result = computeHealthScore(
      createSnapshot({
        coolantTemp: 110,
        oilPressure: 36,
        batteryVoltage: 12.1,
        turboBoost: 1.1,
        brakeWear: 80,
        exhaustTemp: 520,
        fuelLevel: 15,
        speed: 42
      }),
      []
    )

    expect(result.status).toBe("watch")
    expect(result.trend).toBe("stable")
    expect(result.weakestSubsystem).toBe("brakes")
    expect(result.overall).toBe(75.5)
    expect(result.signalQuality).toBe(99)
  })

  it("applies fault penalties and degraded signal quality to produce a critical score", () => {
    const faults = [
      createFault({ id: "fault-brake", subsystem: "brakes", severity: "safety", occurrences: 4 }),
      createFault({ id: "fault-engine", dtcCode: "P0524", subsystem: "engine", severity: "critical" }),
      createFault({ id: "fault-cooling", dtcCode: "P0217", subsystem: "cooling", severity: "warning" }),
      createFault({ id: "fault-electrical", dtcCode: "B1101", subsystem: "electrical", severity: "critical" }),
      createFault({ id: "fault-exhaust", dtcCode: "P0420", subsystem: "exhaust", severity: "warning" })
    ]

    const result = computeHealthScore(
      createSnapshot({
        coolantTemp: Number.POSITIVE_INFINITY,
        oilPressure: Number.NEGATIVE_INFINITY,
        batteryVoltage: 12,
        turboBoost: 1,
