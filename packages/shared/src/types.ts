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

export interface Alert {
  id: string
  vehicleId: string
  severity: DtcSeverity
  title: string
  subsystem: SubsystemKey
  occurredAt: string
  count: number
}

export interface PriorityBreakdown {
  safetyUrgency: number
  failureProximity: number
  businessImpact: number
  downtimeCost: number
  serviceWindow: number
  reasons: string[]
}

export interface PriorityEntry {
  vehicleId: string
  score: number
  status: FleetStatus
  breakdown: PriorityBreakdown
}

export interface DepotRecommendation {
  depotId: string
  score: number
  etaHours: number
  distanceKm: number
  capacityOpen: number
  specialtyMatch: boolean
  partsReady: boolean
  reasons: string[]
  requiredParts: Part[]
}

export interface TechnicianRecommendation {
  technicianId: string
  score: number
  reasons: string[]
}

export interface ServiceTimelineEvent {
  status: ServiceRequestStatus
  at: string
  note: string
}

export interface ServiceRequest {
  id: string
  vehicleId: string
  priorityScore: number
  weakestSubsystem: SubsystemKey
  depotId: string | null
  technicianId: string | null
  requiredPartNumbers: string[]
  status: ServiceRequestStatus
  createdAt: string
  scheduledFor: string | null
  timeline: ServiceTimelineEvent[]
}

export interface ServiceHistoryRecord {
  id: string
  vehicleId: string
  depotId: string
  technicianId: string
  subsystem: SubsystemKey
  outcome: string
  resolvedAt: string
  firstTimeFix: boolean
}

export interface LivePulse {
  id: string
  kind: "tick" | "dispatch" | "progress" | "complete"
  message: string
  at: string
}

export interface DemoState {
  vehicles: Vehicle[]
  signals: Record<string, VehicleSignalSnapshot>
  faults: Record<string, VehicleFault[]>
  depots: Depot[]
  parts: Part[]
  inventory: InventoryItem[]
  technicians: Technician[]
  serviceRequests: ServiceRequest[]
  serviceHistory: ServiceHistoryRecord[]
  livePulse: LivePulse[]
}

export interface FleetOverview {
  totalVehicles: number
  healthyVehicles: number
  watchVehicles: number
  criticalVehicles: number
  openServiceRequests: number
  avgTurnaroundHours: number
  firstTimeFixRate: number
  bayUtilization: number
}

export interface DashboardSnapshot {
  overview: FleetOverview
  healthByVehicle: Record<string, HealthScore>
  alerts: Alert[]
  priorityQueue: PriorityEntry[]
  depotRecommendations: Record<string, DepotRecommendation[]>
  technicianRecommendations: Record<string, TechnicianRecommendation[]>
  livePulse: LivePulse[]
}
