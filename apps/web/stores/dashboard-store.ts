import { create } from "zustand"
import type {
  DashboardSnapshot,
  Depot,
  ForensicsSnapshot,
  HealthScore,
  IntelligenceSnapshot,
  ServiceRequest,
  Technician,
  Vehicle,
  VehicleFault,
} from "@kaz/shared"

export type VehicleRecord = Vehicle & {
  signal: Record<string, number | string>
  health: HealthScore
  faults: VehicleFault[]
  priority: DashboardSnapshot["priorityQueue"][number] | null
  depotRecommendations: DashboardSnapshot["depotRecommendations"][string]
  currentRequest: ServiceRequest | null
}

interface DashboardState {
  vehicles: VehicleRecord[]
  depots: Depot[]
  technicians: Technician[]
  serviceRequests: ServiceRequest[]
  priorityQueue: DashboardSnapshot["priorityQueue"]
  alerts: DashboardSnapshot["alerts"]
  overview: DashboardSnapshot["overview"] | null
  aiEscalations: NonNullable<DashboardSnapshot["aiEscalations"]>
  livePulse: DashboardSnapshot["livePulse"]
  forensics: ForensicsSnapshot | null
  intelligence: IntelligenceSnapshot | null
  sseConnected: boolean
  lastEventAt: string | null
  generatedAt: string | null

  setSnapshot: (data: DashboardSnapshot & {
    vehicles: VehicleRecord[]
    depots: Depot[]
    technicians?: Technician[]
    serviceRequests: ServiceRequest[]
