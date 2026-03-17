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
  technicianRecommendations: DashboardSnapshot["technicianRecommendations"][string]
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
    forensics?: ForensicsSnapshot
    generatedAt: string
  }) => void
  setIntelligence: (data: IntelligenceSnapshot | null) => void
  setSseConnected: (connected: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  vehicles: [],
  depots: [],
  technicians: [],
  serviceRequests: [],
  priorityQueue: [],
  alerts: [],
  overview: null,
  aiEscalations: [],
  livePulse: [],
  forensics: null,
  intelligence: null,
  sseConnected: false,
  lastEventAt: null,
  generatedAt: null,

  setSnapshot: (data) =>
    set({
      vehicles: data.vehicles,
      depots: data.depots,
      technicians: data.technicians ?? [],
      serviceRequests: data.serviceRequests,
      priorityQueue: data.priorityQueue,
      alerts: data.alerts,
      overview: data.overview,
      aiEscalations: data.aiEscalations ?? [],
      livePulse: data.livePulse,
      forensics: data.forensics ?? null,
      generatedAt: data.generatedAt,
      lastEventAt: new Date().toISOString(),
    }),

  setIntelligence: (data) => set({ intelligence: data }),
  setSseConnected: (connected) => set({ sseConnected: connected }),
}))
