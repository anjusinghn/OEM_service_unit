export type DtcSeverity = "info" | "warning" | "critical" | "safety"
export type TrendDirection = "improving" | "stable" | "degrading"
export type FleetStatus = "healthy" | "watch" | "critical"

export type SubsystemKey =
  | "engine"
  | "cooling"
  | "brakes"
  | "electrical"
  | "exhaust"
  | "turbo"
  | "fuel"
  | "transmission"

export type ServiceRequestStatus =
  | "DETECTED"
  | "PRIORITIZED"
  | "DEPOT_ASSIGNED"
  | "PARTS_CONFIRMED"
  | "TECHNICIAN_ASSIGNED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"

export interface Coordinates {
  lat: number
  lng: number
}

export interface Vehicle {
  id: string
  vin: string
  make: string
  model: string
  year: number
  region: string
  routeName: string
  buildBatch: string
  softwareVersion: string
  cargoPriority: number
  routeCriticality: number
  downtimeCostPerHour: number
  nextStopHours: number
  coordinates: Coordinates
  depotAffinityId: string
}

export interface VehicleSignalSnapshot {
  vehicleId: string
  timestamp: string
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

export interface VehicleFault {
  id: string
  vehicleId: string
  dtcCode: string
  subsystem: SubsystemKey
  severity: DtcSeverity
  title: string
  description: string
  occurredAt: string
  occurrences: number
}

export interface HealthScore {
  overall: number
  signalQuality: number
  trend: TrendDirection
  status: FleetStatus
  weakestSubsystem: SubsystemKey
  subsystems: Record<SubsystemKey, number>
}

export interface Depot {
  id: string
  name: string
  city: string
  region: string
  coordinates: Coordinates
  specialties: SubsystemKey[]
  totalBays: number
  occupiedBays: number
}

export interface Part {
  partNumber: string
  name: string
  subsystem: SubsystemKey
  leadDays: number
  price: number
}

export interface InventoryItem {
  depotId: string
  partNumber: string
  quantity: number
  reorderPoint: number
}

export interface Technician {
  id: string
  name: string
  depotId: string
  certifications: SubsystemKey[]
  currentLoad: number
  maxLoad: number
  firstTimeFixRate: number
}
