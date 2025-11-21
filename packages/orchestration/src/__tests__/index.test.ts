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
