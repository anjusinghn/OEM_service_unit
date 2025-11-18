import type { OEMAdapter } from "@kaz/oem-adapters-core"
import {
  PARTS_BY_SUBSYSTEM,
  SUBSYSTEMS,
  addHours,
  createId,
  type DemoState,
  type Depot,
  type ForensicsSnapshot,
  type InventoryItem,
  type LivePulse,
  type Part,
  type ServiceHistoryRecord,
  type SubsystemKey,
  type SupplierInfo,
  type Technician,
  type Vehicle,
  type VehicleFault,
  type VehicleSignalSnapshot
} from "@kaz/shared"

const cities = [
  { city: "Pune", region: "West", lat: 18.5204, lng: 73.8567 },
  { city: "Jaipur", region: "North", lat: 26.9124, lng: 75.7873 },
  { city: "Bengaluru", region: "South", lat: 12.9716, lng: 77.5946 },
  { city: "Chennai", region: "South", lat: 13.0827, lng: 80.2707 },
  { city: "Nagpur", region: "Central", lat: 21.1458, lng: 79.0882 },
  { city: "Delhi", region: "North", lat: 28.6139, lng: 77.209 }
]

const models = ["Atlas Hauler", "RidgeRunner", "MetroMover", "CargoMax", "Axion Bus"]

const subsystemFaultProfiles: Record<SubsystemKey, { code: string; title: string; description: string }> = {
  engine: {
    code: "P0524",
    title: "Engine oil pressure falling",
    description: "Oil pressure trend suggests lubrication system degradation."
  },
  cooling: {
    code: "P0217",
    title: "Engine over-temperature risk",
    description: "Coolant loop is running hotter than normal under load."
  },
  brakes: {
    code: "C1234",
    title: "Brake wear threshold exceeded",
    description: "Brake pad wear is approaching unsafe limits."
  },
  electrical: {
    code: "B1101",
    title: "Charging system instability",
    description: "Battery and alternator voltage readings are unstable."
  },
  exhaust: {
    code: "P0420",
    title: "Aftertreatment efficiency dropping",
    description: "DPF / NOx system efficiency has fallen below baseline."
  },
  turbo: {
    code: "P0299",
    title: "Turbo boost under target",
    description: "Boost pressure trend is below requested torque demand."
  },
  fuel: {
    code: "P0087",
    title: "Fuel rail pressure low",
    description: "Fuel delivery pressure is insufficient for current demand."
  },
  transmission: {
    code: "P0715",
    title: "Transmission input signal drift",
    description: "Shift behavior suggests valve body or input sensor wear."
  }
}

const seeded = (seed: number) => {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const pickSubsystem = (rng: () => number): SubsystemKey => SUBSYSTEMS[Math.floor(rng() * SUBSYSTEMS.length)]

const shift = (base: number, delta: number, rng: () => number) => base + (rng() - 0.5) * delta

const createDepots = (): Depot[] =>
  cities.map((item, index) => ({
    id: createId("depot", index + 1),
    name: `${item.city} Response Hub`,
    city: item.city,
    region: item.region,
    coordinates: { lat: item.lat, lng: item.lng },
    specialties: [SUBSYSTEMS[index % SUBSYSTEMS.length], SUBSYSTEMS[(index + 2) % SUBSYSTEMS.length], SUBSYSTEMS[(index + 4) % SUBSYSTEMS.length]],
    totalBays: 10 + (index % 3) * 2,
    occupiedBays: 4 + (index % 4)
  }))

const createVehicles = (rng: () => number, depots: Depot[]): Vehicle[] => {
  return Array.from({ length: 96 }, (_, index) => {
    const depot = depots[index % depots.length]
    return {
      id: createId("veh", index + 1),
      vin: `KAZ${String(2026 + (index % 2)).slice(-2)}${String(index + 1).padStart(11, "0")}`,
      make: index % 5 === 0 ? "VW" : "kazindustries-demo",
      model: models[index % models.length],
      year: 2022 + (index % 4),
      region: depot.region,
      routeName: `${depot.city} Corridor ${1 + (index % 4)}`,
      buildBatch: `BATCH-24Q${1 + (index % 4)}`,
      softwareVersion: `v3.${index % 5}.${index % 3}`,
      cargoPriority: 45 + Math.round(rng() * 50),
      routeCriticality: 40 + Math.round(rng() * 55),
      downtimeCostPerHour: 850 + Math.round(rng() * 2350),
      nextStopHours: 2 + Math.round(rng() * 18),
      coordinates: {
        lat: shift(depot.coordinates.lat, 1.8, rng),
        lng: shift(depot.coordinates.lng, 1.8, rng)
      },
      depotAffinityId: depot.id
    }
