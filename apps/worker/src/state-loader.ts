import {
  depotRepository,
  partsRepository,
  prisma,
  serviceHistoryRepository,
  serviceRequestRepository,
  technicianRepository,
  vehicleRepository,
  type Prisma
} from "@kaz/db"
import { computeHealthScore } from "@kaz/signal-trust"
import {
  type DemoState,
  type HealthScore,
  type InventoryItem,
  type Part,
  type SubsystemKey,
  type Technician,
  type Vehicle,
  type VehicleFault,
  type VehicleSignalSnapshot,
  type Depot
} from "@kaz/shared"

const isString = (value: unknown): value is string => typeof value === "string"

const isSubsystemKey = (value: string): value is SubsystemKey =>
  ["engine", "cooling", "brakes", "electrical", "exhaust", "turbo", "fuel", "transmission"].includes(value)

const toStringArray = (value: Prisma.JsonValue | null | undefined): string[] =>
  Array.isArray(value) ? value.filter(isString) : []

const toSubsystemArray = (value: Prisma.JsonValue | null | undefined): SubsystemKey[] =>
  toStringArray(value).filter(isSubsystemKey)

const defaultSignalSnapshot = (vehicleId: string): VehicleSignalSnapshot => ({
  vehicleId,
  timestamp: new Date(0).toISOString(),
  coolantTemp: 87,
  oilPressure: 48,
  batteryVoltage: 13.4,
  turboBoost: 1.7,
  brakeWear: 32,
  exhaustTemp: 365,
  fuelLevel: 62,
  speed: 56,
  mileage: 40000
})

type LatestSignalRow = {
  vehicleId: string
  timestamp: Date
  coolantTemp: number
  oilPressure: number
  batteryVoltage: number
  turboBoost: number
  brakeWear: number
  exhaustTemp: number
  fuelLevel: number
  speed: number
  mileage: number
}

const loadLatestSignals = async (): Promise<Record<string, VehicleSignalSnapshot>> => {
  const rows = await prisma.$queryRaw<LatestSignalRow[]>`
    SELECT DISTINCT ON (vehicle_id)
      vehicle_id AS "vehicleId",
      timestamp,
      coolant_temp AS "coolantTemp",
      oil_pressure AS "oilPressure",
      battery_voltage AS "batteryVoltage",
      turbo_boost AS "turboBoost",
      brake_wear AS "brakeWear",
      exhaust_temp AS "exhaustTemp",
      fuel_level AS "fuelLevel",
      speed,
      mileage
    FROM vehicle_signals
    ORDER BY vehicle_id, timestamp DESC
  `

  return Object.fromEntries(
    rows.map((row) => [
      row.vehicleId,
      {
        vehicleId: row.vehicleId,
        timestamp: row.timestamp.toISOString(),
        coolantTemp: row.coolantTemp,
        oilPressure: row.oilPressure,
        batteryVoltage: row.batteryVoltage,
        turboBoost: row.turboBoost,
        brakeWear: row.brakeWear,
        exhaustTemp: row.exhaustTemp,
        fuelLevel: row.fuelLevel,
        speed: row.speed,
        mileage: row.mileage
      }
    ])
  )
}

const mapVehicle = (vehicle: Awaited<ReturnType<typeof vehicleRepository.findAll>>[number]): Vehicle => ({
  id: vehicle.id,
  vin: vehicle.vin,
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year,
  region: vehicle.region,
  routeName: vehicle.routeName,
  buildBatch: vehicle.buildBatch,
  softwareVersion: vehicle.softwareVersion,
  cargoPriority: vehicle.cargoPriority,
  routeCriticality: vehicle.routeCriticality,
  downtimeCostPerHour: vehicle.downtimeCostPerHour,
  nextStopHours: vehicle.nextStopHours,
  coordinates: { lat: vehicle.latitude, lng: vehicle.longitude },
  depotAffinityId: vehicle.depotAffinityId ?? ""
})

const mapDepot = (depot: Awaited<ReturnType<typeof depotRepository.findAll>>[number]): Depot => ({
  id: depot.id,
  name: depot.name,
  city: depot.city,
  region: depot.region,
  coordinates: { lat: depot.latitude, lng: depot.longitude },
  specialties: toSubsystemArray(depot.specialties),
  totalBays: depot.totalBays,
  occupiedBays: depot.occupiedBays
})

const mapTechnician = (technician: Awaited<ReturnType<typeof technicianRepository.findAll>>[number]): Technician => ({
  id: technician.id,
  name: technician.name,
  depotId: technician.depotId,
  certifications: toSubsystemArray(technician.certifications),
  currentLoad: technician.currentLoad,
  maxLoad: technician.maxLoad,
  firstTimeFixRate: technician.firstTimeFixRate
})

const mapPart = (part: Awaited<ReturnType<typeof partsRepository.getCatalog>>[number]): Part => ({
  partNumber: part.partNumber,
  name: part.name,
  subsystem: isSubsystemKey(part.subsystem) ? part.subsystem : "engine",
  leadDays: part.leadDays,
  price: part.price
})

const mapInventory = (item: Awaited<ReturnType<typeof partsRepository.getInventory>>[number]): InventoryItem => ({
  depotId: item.depotId,
  partNumber: item.partNumber,
  quantity: item.quantity,
  reorderPoint: item.reorderPoint
})

const mapFault = (fault: Awaited<ReturnType<typeof prisma.vehicleFault.findMany>>[number]): VehicleFault => ({
  id: fault.id,
  vehicleId: fault.vehicleId,
  dtcCode: fault.dtcCode,
  subsystem: isSubsystemKey(fault.subsystem) ? fault.subsystem : "engine",
  severity: fault.severity as VehicleFault["severity"],
  title: fault.title,
  description: fault.description,
  occurredAt: fault.occurredAt.toISOString(),
  occurrences: fault.occurrences
})
