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
  })
}

const createSignalSnapshot = (vehicle: Vehicle, rng: () => number, faultBias = 0): VehicleSignalSnapshot => ({
  vehicleId: vehicle.id,
  timestamp: new Date().toISOString(),
  coolantTemp: shift(87 + faultBias * 6, 8, rng),
  oilPressure: shift(48 - faultBias * 8, 9, rng),
  batteryVoltage: shift(13.4 - faultBias * 0.7, 0.8, rng),
  turboBoost: shift(1.7 - faultBias * 0.45, 0.35, rng),
  brakeWear: shift(32 + faultBias * 24, 16, rng),
  exhaustTemp: shift(365 + faultBias * 95, 44, rng),
  fuelLevel: shift(62, 28, rng),
  speed: shift(56, 22, rng),
  mileage: 40000 + Math.round(rng() * 185000)
})

const createFault = (vehicleId: string, subsystem: SubsystemKey, rng: () => number, critical = false): VehicleFault => {
  const profile = subsystemFaultProfiles[subsystem]
  return {
    id: `${vehicleId}-${profile.code}`,
    vehicleId,
    dtcCode: profile.code,
    subsystem,
    severity: critical ? "critical" : rng() > 0.7 ? "safety" : "warning",
    title: profile.title,
    description: profile.description,
    occurredAt: addHours(new Date().toISOString(), -1 * (1 + Math.round(rng() * 24))),
    occurrences: 1 + Math.round(rng() * 5)
  }
}

const createParts = (): Part[] =>
  Object.entries(PARTS_BY_SUBSYSTEM).flatMap(([subsystem, partItems]) =>
    partItems.map((part, index) => ({
      partNumber: part.partNumber,
      name: part.name,
      subsystem: subsystem as SubsystemKey,
      leadDays: 1 + (index % 3),
      price: 2800 + index * 1700
    }))
  )

const createInventory = (depots: Depot[], parts: Part[], rng: () => number): InventoryItem[] =>
  depots.flatMap((depot) =>
    parts.map((part) => ({
      depotId: depot.id,
      partNumber: part.partNumber,
      quantity: 1 + Math.round(rng() * 8),
      reorderPoint: 2
    }))
  )

const createTechnicians = (depots: Depot[], rng: () => number): Technician[] => {
  const firstNames = ["Rajesh", "Mira", "Ayaan", "Divya", "Kiran", "Pranav", "Ishita", "Naveen"]
  const lastNames = ["K", "Rao", "Singh", "Patil", "Mehta", "Das", "Jain", "Verma"]
  return depots.flatMap((depot, depotIndex) =>
    Array.from({ length: 5 }, (_, index) => ({
      id: createId(`tech-${depotIndex + 1}`, index + 1),
      depotId: depot.id,
      name: `${firstNames[(depotIndex + index) % firstNames.length]} ${lastNames[(depotIndex * 2 + index) % lastNames.length]}`,
      certifications: [depot.specialties[index % depot.specialties.length], pickSubsystem(rng)],
      currentLoad: Math.round(rng() * 3),
      maxLoad: 5,
      firstTimeFixRate: 0.72 + rng() * 0.24
    }))
  )
}

const createServiceHistory = (vehicles: Vehicle[], depots: Depot[], technicians: Technician[], rng: () => number): ServiceHistoryRecord[] =>
  Array.from({ length: 28 }, (_, index) => {
    const vehicle = vehicles[index * 3]
    const depot = depots[index % depots.length]
    const technician = technicians.find((item) => item.depotId === depot.id) ?? technicians[0]
    const subsystem = pickSubsystem(rng)
    return {
      id: createId("srvhist", index + 1),
      vehicleId: vehicle.id,
      depotId: depot.id,
      technicianId: technician.id,
      subsystem,
      outcome: `Resolved ${subsystemFaultProfiles[subsystem].title.toLowerCase()}`,
      resolvedAt: addHours(new Date().toISOString(), -1 * (48 + index * 5)),
      firstTimeFix: rng() > 0.16
    }
  })

const createLivePulse = (): LivePulse[] => [
  {
    id: "pulse-001",
    kind: "tick",
    message: "Service orchestration demo ready. Live telemetry pulses every 12 seconds.",
    at: new Date().toISOString()
  }
]

const createSuppliers = (): SupplierInfo[] => [
  {
    id: createId("supplier", 1),
    name: "Precision Components Ltd",
    componentTypes: ["turbocharger", "exhaust_sensor"],
    activeBatches: ["BATCH-4471", "BATCH-4472", "BATCH-4476"]
  },
  {
    id: createId("supplier", 2),
    name: "Bharath Auto Parts",
    componentTypes: ["coolant_sensor", "coolant_pump"],
    activeBatches: ["BATCH-4521", "BATCH-4522"]
  },
  {
    id: createId("supplier", 3),
    name: "TechDrive Electronics",
    componentTypes: ["alternator", "battery_module"],
    activeBatches: ["BATCH-4630", "BATCH-4631", "BATCH-4634", "BATCH-4638"]
  },
  {
    id: createId("supplier", 4),
    name: "SafeStop Brakes",
    componentTypes: ["brake_pad", "brake_line"],
    activeBatches: ["BATCH-4710", "BATCH-4711", "BATCH-4714"]
  },
  {
