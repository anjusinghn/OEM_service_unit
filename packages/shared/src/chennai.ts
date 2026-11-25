import { PARTS_BY_SUBSYSTEM } from "./constants"
import type { Coordinates, Depot, InventoryItem, Part, Technician, Vehicle, VehicleFault, VehicleSignalSnapshot } from "./types"
import { distanceKm, round } from "./utils"

export const CHENNAI_SCENARIO = "chennai-ashok-leyland"
export const CHENNAI_ORG_ID = "org-chennai-demo"
export const CHENNAI_FAULT_VEHICLE = "chennai-truck-01"
export const CHENNAI_COOLING_DTC = "P0217"
export const CHENNAI_COOLING_PART = "COOL-PUMP-04"
const region = "Greater Chennai"

export const chennaiWorkshops: (Depot & { address: string; map: string; source: string; pin: "published" | "approximate" })[] = [
  {
    id: "chennai-poonamallee", name: "TVS Poonamallee", city: "Poonamallee", region,
    address: "2/330, Matruvazhi Salai, Poonamallee, Chennai 600056",
    map: "https://maps.app.goo.gl/tu63KiYVNZd1m8FN9", source: "https://www.tvs.in/ashok-leyland/",
    pin: "published", coordinates: { lat: 13.0558447, lng: 80.0962518 },
    specialties: ["cooling", "engine", "electrical", "brakes"], totalBays: 2, occupiedBays: 0
  },
  {
    id: "chennai-madhavaram", name: "TVS Madhavaram", city: "Madhavaram", region,
    address: "S No 149/1 and 151/2, Madhavaram Red Hills High Road, Puzhal, Chennai 600066",
    map: "https://in.infoaboutcompanies.com/Catalog/TN/Chennai/Motor-Vehicle-Dealer/T-V-Sundram-Iyengar-_and_-Sons-Ltd._Madhavaram", source: "https://www.tvs.in/ashok-leyland/",
    pin: "approximate", coordinates: { lat: 13.1662, lng: 80.2209 },
    specialties: ["cooling", "engine", "brakes", "transmission"], totalBays: 3, occupiedBays: 0
  }
]

const routes = [
  {
    name: "Poonamallee–Sriperumbudur", depotId: "chennai-poonamallee",
    points: [{ lat: 13.052, lng: 80.091 }, { lat: 13.047, lng: 80.056 }, { lat: 13.023, lng: 80.012 }, { lat: 12.968, lng: 79.943 }]
  },
  {
    name: "Madhavaram–Puzhal", depotId: "chennai-madhavaram",
    points: [{ lat: 13.148, lng: 80.224 }, { lat: 13.153, lng: 80.209 }, { lat: 13.162, lng: 80.196 }, { lat: 13.183, lng: 80.174 }]
  }
]

export const chennaiVehicles: Vehicle[] = Array.from({ length: 12 }, (_, i) => {
  const route = routes[i < 6 ? 0 : 1]
  const number = String(i + 1).padStart(2, "0")
  return {
    id: `chennai-truck-${number}`, vin: `SIM-AL-CHENNAI-${number}`, make: "Ashok Leyland",
    model: "Medium/heavy truck (simulated)", year: 2023 + i % 3, region, routeName: route.name,
    buildBatch: "CHENNAI-SIM", softwareVersion: "sim-1",
    cargoPriority: i === 0 ? 85 : 50, routeCriticality: i === 0 ? 80 : 50, downtimeCostPerHour: 1200,
    nextStopHours: 1, coordinates: route.points[0], depotAffinityId: route.depotId
  }
})

export const chennaiParts: Part[] = Object.entries(PARTS_BY_SUBSYSTEM).flatMap(([subsystem, parts]) =>
  parts.map((part) => ({ ...part, subsystem: subsystem as Part["subsystem"], leadDays: 1, price: 4000 }))
)

export function chennaiInventory(nearbyPartInStock: boolean): InventoryItem[] {
  return chennaiWorkshops.flatMap((depot) => chennaiParts.map((part) => ({
    depotId: depot.id, partNumber: part.partNumber,
    quantity: depot.id === "chennai-poonamallee" && part.partNumber === CHENNAI_COOLING_PART && !nearbyPartInStock ? 0 : 8,
    reorderPoint: 2
  })))
}

export const chennaiTechnicians: Technician[] = chennaiWorkshops.flatMap((depot) =>
  depot.specialties.map((specialty) => ({
    id: `${depot.id}-tech-${specialty}`, depotId: depot.id,
    name: `${depot.city} ${specialty} technician (simulated)`,
    certifications: [specialty], currentLoad: 0, maxLoad: 1, firstTimeFixRate: 0.85
  }))
)

export const chennaiCoolingFault = {
  dtcCode: CHENNAI_COOLING_DTC,
  title: "Coolant temperature above normal",
  description: "Scripted coolant circulation fault in the Chennai simulation."
}

const faultStartTick = 3
export const CHENNAI_PARK_TICK = 8
const ticksPerLeg = 12

export interface ChennaiFrame {
  coordinates: Coordinates
  signal: VehicleSignalSnapshot
  fault?: VehicleFault
}

function sampleNoise(seed: number, tick: number, vehicleIndex: number) {
  let state = (seed ^ Math.imul(vehicleIndex + 1, 0x9e3779b9) ^ Math.imul(tick, 0x85ebca6b)) >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32 - 0.5
  }
}

export function chennaiFrame(vehicleIndex: number, tick: number, seed: number, time: Date, options: {
  repaired?: boolean
  parked?: boolean
  movingTick?: number
  previous?: { coordinates: Coordinates; mileage: number }
} = {}): ChennaiFrame {
  const vehicle = chennaiVehicles[vehicleIndex]
  const points = routes[vehicleIndex < 6 ? 0 : 1].points
  const faulted = vehicle.id === CHENNAI_FAULT_VEHICLE && !options.repaired && tick >= faultStartTick
  const parked = options.parked || (faulted && tick >= CHENNAI_PARK_TICK)
  const movingTick = options.movingTick ?? (faulted ? Math.min(tick, CHENNAI_PARK_TICK) : tick)
  const tripTicks = (points.length - 1) * ticksPerLeg
  const offset = (movingTick + (vehicleIndex % 6) * 3) % (tripTicks * 2)
  const position = offset <= tripTicks ? offset : tripTicks * 2 - offset
  const segment = Math.min(Math.floor(position / ticksPerLeg), points.length - 2)
  const progress = position / ticksPerLeg - segment
  const start = points[segment]
  const end = points[segment + 1]
  const coordinates = options.parked && options.previous ? options.previous.coordinates : {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress
  }
  const noise = sampleNoise(seed, tick, vehicleIndex)
  const severity = faulted ? Math.min(1, (tick - faultStartTick + 1) / 6) : 0
  return {
    coordinates,
    signal: {
      vehicleId: vehicle.id, timestamp: time.toISOString(),
      coolantTemp: round(88 + severity * 28 + noise() * 4, 1),
      oilPressure: round(47 + noise() * 7, 1), batteryVoltage: round(13.5 + noise() * 0.6, 2),
      turboBoost: round(1.65 + noise() * 0.3, 2), brakeWear: round(31 + noise() * 4, 1),
      exhaustTemp: round(365 + noise() * 25, 1), fuelLevel: round(64 + noise() * 6, 1),
      speed: parked ? 0 : round(42 + noise() * 10, 1),
      mileage: round(options.previous ? options.previous.mileage + distanceKm(options.previous.coordinates, coordinates) : 64000 + vehicleIndex * 310 + movingTick * 0.4, 2)
    },
    fault: faulted ? {
      ...chennaiCoolingFault, id: `${vehicle.id}-${CHENNAI_COOLING_DTC}`, vehicleId: vehicle.id,
      subsystem: "cooling", severity: severity >= 1 ? "critical" : "warning",
      occurredAt: time.toISOString(), occurrences: 1
    } : undefined
  }
}

export function assertChennaiStorage(databaseUrl?: string, redisUrl?: string) {
  const local = (host: string) => host === "127.0.0.1" || host === "localhost"
  const database = databaseUrl && new URL(databaseUrl)
  const redis = redisUrl && new URL(redisUrl)
  if (!database || !local(database.hostname) || database.port !== "5548" || database.pathname !== "/oem_chennai_demo" ||
      !redis || !local(redis.hostname) || redis.port !== "6388") {
    throw new Error("The Chennai scenario requires local PostgreSQL on port 5548 (oem_chennai_demo) and Redis on port 6388.")
  }
}
