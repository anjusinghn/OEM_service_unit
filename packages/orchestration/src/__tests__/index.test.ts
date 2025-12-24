import {
  PARTS_BY_SUBSYSTEM,
  SUBSYSTEMS,
  type DemoState,
  type HealthScore,
  type ServiceHistoryRecord,
  type ServiceRequest,
  type ServiceRequestStatus,
  type SubsystemKey,
  type Vehicle,
  type VehicleFault,
  type VehicleSignalSnapshot
} from "@kaz/shared"
import { computeHealthScore } from "@kaz/signal-trust"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildOverview,
  buildPriorityQueue,
  buildSnapshot,
  createServiceRequest,
  getNextServiceStatus,
  recommendDepots
} from "../index"

const depotCities = [
  { city: "Pune", region: "West", lat: 18.5204, lng: 73.8567 },
  { city: "Jaipur", region: "North", lat: 26.9124, lng: 75.7873 },
  { city: "Bengaluru", region: "South", lat: 12.9716, lng: 77.5946 },
  { city: "Chennai", region: "South", lat: 13.0827, lng: 80.2707 },
  { city: "Nagpur", region: "Central", lat: 21.1458, lng: 79.0882 },
  { city: "Delhi", region: "North", lat: 28.6139, lng: 77.209 },
  { city: "Hyderabad", region: "South", lat: 17.385, lng: 78.4867 },
  { city: "Ahmedabad", region: "West", lat: 23.0225, lng: 72.5714 },
  { city: "Kolkata", region: "East", lat: 22.5726, lng: 88.3639 },
  { city: "Lucknow", region: "North", lat: 26.8467, lng: 80.9462 }
] as const

const models = ["Atlas Hauler", "RidgeRunner", "MetroMover", "CargoMax", "Axion Bus"]

const createSnapshot = (vehicleId: string, overrides: Partial<VehicleSignalSnapshot> = {}): VehicleSignalSnapshot => ({
  vehicleId,
  timestamp: "2026-03-18T09:00:00.000Z",
  coolantTemp: 89,
  oilPressure: 48,
  batteryVoltage: 13.3,
  turboBoost: 1.65,
  brakeWear: 34,
  exhaustTemp: 378,
  fuelLevel: 58,
  speed: 54,
  mileage: 120000,
  ...overrides
})

const createFault = (vehicleId: string, subsystem: SubsystemKey, severity: VehicleFault["severity"], overrides: Partial<VehicleFault> = {}): VehicleFault => ({
  id: `${vehicleId}-${subsystem}-${severity}`,
  vehicleId,
  dtcCode: `${subsystem.toUpperCase()}-001`,
  subsystem,
  severity,
  title: `${subsystem} issue`,
  description: `${subsystem} requires service`,
  occurredAt: "2026-03-18T08:30:00.000Z",
  occurrences: 2,
  ...overrides
})

const createParts = () =>
  Object.entries(PARTS_BY_SUBSYSTEM).flatMap(([subsystem, parts]) =>
    parts.map((part, index) => ({
      partNumber: part.partNumber,
      name: part.name,
      subsystem: subsystem as SubsystemKey,
      leadDays: 1 + (index % 3),
      price: 2800 + index * 1700
    }))
  )

const createForensicsSnapshot = () => ({
  cohorts: [],
  anomalies: [],
  patterns: [],
  investigations: [],
  supplierScorecards: [],
  heatmapData: []
})

const createDemoFixture = (): { state: DemoState; healthByVehicle: Record<string, HealthScore> } => {
  const parts = createParts()
  const depots = depotCities.map((city, index) => ({
    id: `depot-${String(index + 1).padStart(3, "0")}`,
    name: `${city.city} Response Hub`,
    city: city.city,
    region: city.region,
    coordinates: { lat: city.lat, lng: city.lng },
    specialties: [
      SUBSYSTEMS[index % SUBSYSTEMS.length],
      SUBSYSTEMS[(index + 2) % SUBSYSTEMS.length],
      SUBSYSTEMS[(index + 4) % SUBSYSTEMS.length]
    ],
    totalBays: 10 + (index % 3) * 2,
    occupiedBays: 4 + (index % 4)
  }))

  const inventory = depots.flatMap((depot) =>
    parts.map((part) => ({
      depotId: depot.id,
      partNumber: part.partNumber,
      quantity: 3,
      reorderPoint: 2
    }))
  )

  const technicians = depots.flatMap((depot, depotIndex) =>
    Array.from({ length: 5 }, (_, techIndex) => ({
      id: `tech-${depotIndex + 1}-${String(techIndex + 1).padStart(3, "0")}`,
      name: `Technician ${depotIndex + 1}-${techIndex + 1}`,
      depotId: depot.id,
      certifications: [
        SUBSYSTEMS[(depotIndex + techIndex) % SUBSYSTEMS.length],
        SUBSYSTEMS[(depotIndex + techIndex + 3) % SUBSYSTEMS.length]
      ],
      currentLoad: techIndex % 3,
      maxLoad: 5,
      firstTimeFixRate: 0.74 + techIndex * 0.04
    }))
  )

  const vehicles = Array.from({ length: 96 }, (_, index) => {
    const depot = depots[index % depots.length]
    return {
      id: `veh-${String(index + 1).padStart(3, "0")}`,
      vin: `KAZ26${String(index + 1).padStart(11, "0")}`,
      make: index % 5 === 0 ? "VW" : "kazindustries-demo",
      model: models[index % models.length],
      year: 2022 + (index % 4),
      region: depot.region,
      routeName: `${depot.city} Corridor ${1 + (index % 4)}`,
      buildBatch: `BATCH-24Q${1 + (index % 4)}`,
      softwareVersion: `v3.${index % 5}.${index % 3}`,
      cargoPriority: 45 + (index % 50),
      routeCriticality: 40 + (index % 55),
      downtimeCostPerHour: 900 + index * 18,
      nextStopHours: 2 + (index % 12) * 0.8,
      coordinates: {
        lat: depot.coordinates.lat + (index % 4) * 0.08,
        lng: depot.coordinates.lng + (index % 4) * 0.07
      },
      depotAffinityId: depot.id
    } satisfies Vehicle
  })

  const signals = Object.fromEntries(
    vehicles.map((vehicle, index) => {
      const subsystemOffset = index % SUBSYSTEMS.length
      return [
        vehicle.id,
        createSnapshot(vehicle.id, {
          coolantTemp: 88 + subsystemOffset * 0.7,
          oilPressure: 49 - subsystemOffset * 0.6,
          batteryVoltage: 13.4 - subsystemOffset * 0.05,
          turboBoost: 1.7 - subsystemOffset * 0.04,
          brakeWear: 32 + subsystemOffset * 2,
          exhaustTemp: 368 + subsystemOffset * 8,
          fuelLevel: 62 - subsystemOffset * 2,
          speed: 56 - subsystemOffset * 1.5,
          mileage: 120000 + index * 900
        })
      ]
    })
  )

  const faults = Object.fromEntries(
    vehicles.map((vehicle, index) => {
      if (index % 12 === 0) {
        return [vehicle.id, [createFault(vehicle.id, "brakes", "critical")]]
      }

      if (index % 7 === 0) {
        return [vehicle.id, [createFault(vehicle.id, "turbo", "warning")]]
      }

      return [vehicle.id, []]
    })
  ) as Record<string, VehicleFault[]>

  const serviceRequests: ServiceRequest[] = [
    {
      id: "req-001",
      vehicleId: vehicles[0].id,
      priorityScore: 91.2,
      weakestSubsystem: "brakes",
      depotId: depots[0].id,
      technicianId: technicians[0].id,
      requiredPartNumbers: PARTS_BY_SUBSYSTEM.brakes.map((part) => part.partNumber),
      status: "IN_PROGRESS",
      createdAt: "2026-03-18T04:00:00.000Z",
      scheduledFor: "2026-03-18T10:00:00.000Z",
      timeline: [
        { status: "DETECTED", at: "2026-03-18T04:00:00.000Z", note: "Detected" },
        { status: "IN_PROGRESS", at: "2026-03-18T09:30:00.000Z", note: "In progress" }
      ]
    },
    {
      id: "req-002",
      vehicleId: vehicles[1].id,
      priorityScore: 42.5,
      weakestSubsystem: "cooling",
      depotId: depots[1].id,
      technicianId: technicians[5].id,
      requiredPartNumbers: PARTS_BY_SUBSYSTEM.cooling.map((part) => part.partNumber),
      status: "CLOSED",
      createdAt: "2026-03-17T02:00:00.000Z",
      scheduledFor: null,
      timeline: [{ status: "CLOSED", at: "2026-03-17T12:00:00.000Z", note: "Closed" }]
    }
  ]

  const serviceHistory: ServiceHistoryRecord[] = [
    {
      id: "srvhist-001",
      vehicleId: vehicles[2].id,
      depotId: depots[0].id,
      technicianId: technicians[0].id,
      subsystem: "engine",
      outcome: "Resolved engine issue",
      resolvedAt: "2026-03-17T12:00:00.000Z",
      firstTimeFix: true
    },
    {
      id: "srvhist-002",
      vehicleId: vehicles[3].id,
      depotId: depots[1].id,
      technicianId: technicians[5].id,
      subsystem: "turbo",
      outcome: "Resolved turbo issue",
      resolvedAt: "2026-03-17T16:00:00.000Z",
      firstTimeFix: false
    },
    {
      id: "srvhist-003",
      vehicleId: vehicles[4].id,
      depotId: depots[2].id,
      technicianId: technicians[10].id,
      subsystem: "brakes",
      outcome: "Resolved brake issue",
      resolvedAt: "2026-03-17T18:00:00.000Z",
      firstTimeFix: true
    }
  ]

  const state: DemoState = {
    vehicles,
    signals,
    faults,
    depots,
    parts,
    inventory,
    technicians,
    serviceRequests,
    serviceHistory,
    livePulse: [{ id: "pulse-001", kind: "tick", message: "System synced", at: "2026-03-18T09:00:00.000Z" }],
    suppliers: [],
    forensics: createForensicsSnapshot()
  }

  const healthByVehicle = Object.fromEntries(
    state.vehicles.map((vehicle) => [vehicle.id, computeHealthScore(state.signals[vehicle.id], state.faults[vehicle.id])])
  )

  return { state, healthByVehicle }
}

beforeEach(() => {
  vi.useRealTimers()
})

describe("buildPriorityQueue", () => {
  it("ranks the most urgent vehicle first with detailed weighting reasons", () => {
    const { state, healthByVehicle } = createDemoFixture()
    const criticalVehicle = state.vehicles[0]
    const watchVehicle = state.vehicles[1]
    const healthyVehicle = state.vehicles[2]

    Object.assign(criticalVehicle, {
      cargoPriority: 98,
      routeCriticality: 99,
      downtimeCostPerHour: 3400,
      nextStopHours: 1.2
    })
    state.signals[criticalVehicle.id] = createSnapshot(criticalVehicle.id, {
      coolantTemp: 118,
      oilPressure: 24,
      batteryVoltage: 11.9,
      turboBoost: 0.95,
      brakeWear: 92,
      exhaustTemp: 560,
      fuelLevel: 9,
      speed: 12
    })
    state.faults[criticalVehicle.id] = [
      createFault(criticalVehicle.id, "brakes", "safety"),
      createFault(criticalVehicle.id, "engine", "critical"),
      createFault(criticalVehicle.id, "cooling", "warning"),
      createFault(criticalVehicle.id, "electrical", "critical"),
      createFault(criticalVehicle.id, "exhaust", "warning")
    ]

    Object.assign(watchVehicle, {
      cargoPriority: 80,
      routeCriticality: 82,
      downtimeCostPerHour: 2600,
      nextStopHours: 3.5
    })
    state.signals[watchVehicle.id] = createSnapshot(watchVehicle.id, {
      coolantTemp: 110,
      oilPressure: 36,
      batteryVoltage: 12.1,
      turboBoost: 1.1,
      brakeWear: 80,
      exhaustTemp: 520,
      fuelLevel: 15,
      speed: 42
    })
    state.faults[watchVehicle.id] = []

    state.signals[healthyVehicle.id] = createSnapshot(healthyVehicle.id)
    state.faults[healthyVehicle.id] = []

    healthByVehicle[criticalVehicle.id] = computeHealthScore(state.signals[criticalVehicle.id], state.faults[criticalVehicle.id])
    healthByVehicle[watchVehicle.id] = computeHealthScore(state.signals[watchVehicle.id], state.faults[watchVehicle.id])
    healthByVehicle[healthyVehicle.id] = computeHealthScore(state.signals[healthyVehicle.id], state.faults[healthyVehicle.id])

    const queue = buildPriorityQueue(state, healthByVehicle)
    const criticalEntry = queue.find((entry) => entry.vehicleId === criticalVehicle.id)
    const watchEntry = queue.find((entry) => entry.vehicleId === watchVehicle.id)
    const healthyEntry = queue.find((entry) => entry.vehicleId === healthyVehicle.id)

    expect(queue).toHaveLength(96)
    expect(queue[0].vehicleId).toBe(criticalVehicle.id)
    expect(criticalEntry?.status).toBe("critical")
    expect(watchEntry?.status).toBe("watch")
    expect(healthyEntry?.status).toBe("healthy")
    expect(criticalEntry?.score).toBeGreaterThan(watchEntry?.score ?? 0)
    expect(watchEntry?.score).toBeGreaterThan(healthyEntry?.score ?? 0)
    expect(criticalEntry?.breakdown.reasons).toEqual([
      `${healthByVehicle[criticalVehicle.id].weakestSubsystem} is trending ${healthByVehicle[criticalVehicle.id].trend}`,
      `route criticality ${criticalVehicle.routeCriticality}/100`,
      `next serviceable stop in 1.2h`
    ])
  })
})

describe("recommendDepots", () => {
  it("prefers nearby depots with the needed specialty, stock, and open capacity", () => {
    const { state } = createDemoFixture()
    const vehicle = state.vehicles[10]
    const weakestSubsystem: SubsystemKey = "brakes"
    const targetParts = PARTS_BY_SUBSYSTEM[weakestSubsystem].map((part) => part.partNumber)

    vehicle.coordinates = { lat: 18.52, lng: 73.86 }

    state.depots[0].coordinates = { lat: 18.5204, lng: 73.8567 }
    state.depots[0].specialties = ["brakes", "engine", "cooling"]
    state.depots[0].totalBays = 12
    state.depots[0].occupiedBays = 4

    state.depots[1].coordinates = { lat: 18.55, lng: 73.9 }
    state.depots[1].specialties = ["engine", "fuel", "turbo"]
    state.depots[1].totalBays = 12
    state.depots[1].occupiedBays = 1

    state.depots[2].coordinates = { lat: 20.4, lng: 75.2 }
    state.depots[2].specialties = ["brakes", "electrical", "transmission"]
    state.depots[2].totalBays = 10
    state.depots[2].occupiedBays = 7

    for (const item of state.inventory) {
      if (item.depotId === state.depots[0].id && targetParts.includes(item.partNumber)) {
        item.quantity = 4
      }
      if (item.depotId === state.depots[1].id && targetParts.includes(item.partNumber)) {
        item.quantity = 0
      }
      if (item.depotId === state.depots[2].id && targetParts.includes(item.partNumber)) {
        item.quantity = 2
      }
    }

    const recommendations = recommendDepots(vehicle, state, weakestSubsystem)

    expect(recommendations).toHaveLength(3)
    expect(recommendations[0]).toMatchObject({
      depotId: state.depots[0].id,
      specialtyMatch: true,
      partsReady: true,
      capacityOpen: 8
    })
    expect(recommendations[0].requiredParts.map((part) => part.partNumber)).toEqual(targetParts)
    expect(recommendations[0].reasons).toContain("has brakes capability")
    expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score)
    expect(recommendations[1].score).toBeGreaterThanOrEqual(recommendations[2].score)
  })
})

describe("buildOverview", () => {
  it("summarizes fleet health, open work, first-time-fix rate, and bay utilization", () => {
    const { state, healthByVehicle } = createDemoFixture()
    state.signals[state.vehicles[0].id] = createSnapshot(state.vehicles[0].id, {
      coolantTemp: 116,
      oilPressure: 22,
      batteryVoltage: 11.8,
      turboBoost: 0.94,
      brakeWear: 90,
      exhaustTemp: 552,
      fuelLevel: 8,
      speed: 10
    })
    state.faults[state.vehicles[0].id] = [createFault(state.vehicles[0].id, "brakes", "safety")]
    healthByVehicle[state.vehicles[0].id] = computeHealthScore(state.signals[state.vehicles[0].id], state.faults[state.vehicles[0].id])

    const overview = buildOverview(state, healthByVehicle)

    expect(overview.totalVehicles).toBe(96)
    expect(overview.openServiceRequests).toBe(1)
    expect(overview.firstTimeFixRate).toBe(66.7)
    expect(overview.avgTurnaroundHours).toBe(7.9)
    expect(overview.bayUtilization).toBeGreaterThan(35)
    expect(overview.bayUtilization).toBeLessThan(60)
    expect(overview.criticalVehicles + overview.watchVehicles + overview.healthyVehicles).toBe(96)
  })
})

describe("buildSnapshot", () => {
  it("assembles overview, queue, and recommendation maps for the top vehicles", () => {
    const { state, healthByVehicle } = createDemoFixture()
    const alerts = [
      {
        id: "alert-001",
        vehicleId: state.vehicles[0].id,
        severity: "critical" as const,
        title: "Brake wear threshold exceeded",
        subsystem: "brakes" as const,
        occurredAt: "2026-03-18T08:00:00.000Z",
        count: 2
      }
    ]

    const snapshot = buildSnapshot(state, healthByVehicle, alerts)

    expect(snapshot.alerts).toEqual(alerts)
    expect(snapshot.priorityQueue).toHaveLength(96)
    expect(Object.keys(snapshot.depotRecommendations)).toHaveLength(16)
    expect(snapshot.livePulse).toEqual(state.livePulse)

    const topVehicleId = snapshot.priorityQueue[0].vehicleId
    expect(snapshot.depotRecommendations[topVehicleId]?.length).toBeGreaterThan(0)
  })
})

describe("createServiceRequest", () => {
  it("creates a depot-assigned request with the initial workflow timeline", () => {
    const { state } = createDemoFixture()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-18T12:15:00.000Z"))

    const request = createServiceRequest(
      state,
      "veh-042",
      88.4,
      "turbo",
      "depot-003",
      "tech-3-001",
      PARTS_BY_SUBSYSTEM.turbo.map((part) => part.partNumber)
    )

    expect(request).toEqual({
      id: "req-003",
      vehicleId: "veh-042",
      priorityScore: 88.4,
      weakestSubsystem: "turbo",
      depotId: "depot-003",
      technicianId: "tech-3-001",
      requiredPartNumbers: ["TRB-KIT-88", "TRB-HOSE-14"],
      status: "DEPOT_ASSIGNED",
      createdAt: "2026-03-18T12:15:00.000Z",
      scheduledFor: null,
      timeline: [
        {
          status: "DETECTED",
          at: "2026-03-18T12:15:00.000Z",
          note: "Signal Trust flagged the vehicle for intervention."
        },
        {
          status: "PRIORITIZED",
          at: "2026-03-18T12:15:00.000Z",
          note: "Vehicle ranked at priority score 88.4."
        },
        {
          status: "DEPOT_ASSIGNED",
          at: "2026-03-18T12:15:00.000Z",
          note: "Assigned to depot depot-003."
        }
      ]
    })
  })
})

describe("getNextServiceStatus", () => {
  it("advances a service request through the workflow and stops at closed", () => {
    const seen: ServiceRequestStatus[] = ["DETECTED"]
    let current: ServiceRequestStatus = "DETECTED"

    while (current !== "CLOSED") {
      current = getNextServiceStatus(current)
      seen.push(current)
    }

    expect(seen).toEqual([
      "DETECTED",
      "PRIORITIZED",
      "DEPOT_ASSIGNED",
      "PARTS_CONFIRMED",
      "TECHNICIAN_ASSIGNED",
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CLOSED"
    ])
    expect(getNextServiceStatus("CLOSED")).toBe("CLOSED")
  })
})
