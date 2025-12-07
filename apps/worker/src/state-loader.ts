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
