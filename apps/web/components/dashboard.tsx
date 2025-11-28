"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Gauge,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  Menu,
  PackageCheck,
  RadioTower,
  Settings,
  Shield,
  ShieldAlert,
  Wrench,
  X
} from "lucide-react"

import { MetricCard, SectionCard, StatusPill } from "@kaz/ui"
import type {
  AiDispatchPlan,
  DashboardSnapshot,
  Depot,
  ForensicsSnapshot,
  HealthScore,
  IntelligenceSnapshot,
  ServiceRequest,
  Vehicle,
  VehicleFault
} from "@kaz/shared"

type VehicleRecord = Vehicle & {
  signal: Record<string, number | string>
  health: HealthScore
  faults: VehicleFault[]
  priority: DashboardSnapshot["priorityQueue"][number] | null
  depotRecommendations: DashboardSnapshot["depotRecommendations"][string]
  currentRequest: ServiceRequest | null
}

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics: ForensicsSnapshot
  intelligence?: IntelligenceSnapshot
  generatedAt: string
}

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "triage", label: "Triage", icon: Shield },
  { id: "forensics", label: "Forensics", icon: RadioTower },
  { id: "workflow", label: "Workflow", icon: GitBranch },
  { id: "depots", label: "Depot Network", icon: Building2 },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "activity", label: "Activity", icon: Activity },
] as const

const NAV_FOOTER = [
  { id: "settings", label: "Settings", icon: Settings },
] as const

const toneFromHealth = (status: HealthScore["status"]) => {
  if (status === "critical") return "critical" as const
  if (status === "watch") return "watch" as const
  return "success" as const
}

const toneFromRequest = (status: ServiceRequest["status"]) => {
  if (status === "IN_PROGRESS" || status === "SCHEDULED") return "watch" as const
  if (status === "COMPLETED" || status === "CLOSED") return "success" as const
  return "info" as const
}

export function Dashboard() {
  const [payload, setPayload] = useState<DashboardPayload | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [dispatchPlan, setDispatchPlan] = useState<AiDispatchPlan | null>(null)
  const [intelligence, setIntelligence] = useState<IntelligenceSnapshot | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/v1/dashboard`, { cache: "no-store" })
      if (!response.ok) throw new Error("dashboard fetch failed")
      const data = (await response.json()) as DashboardPayload
      const intelligenceResponse = await fetch(`${apiBase}/api/v1/intelligence`, { cache: "no-store" })
      const intelligenceData = intelligenceResponse.ok ? ((await intelligenceResponse.json()) as IntelligenceSnapshot) : null
      setPayload(data)
      setIntelligence(intelligenceData)
      setSelectedVehicleId((c) => c ?? data.priorityQueue[0]?.vehicleId ?? data.vehicles[0]?.id ?? null)
      setError(null)
    } catch (cause) {
      console.error(cause)
      setError("Unable to reach the API. Run pnpm dev:api and refresh.")
    }
  }, [])

  useEffect(() => {
    load()
    const sse = new EventSource(`${apiBase}/api/v1/events`)
    sse.onmessage = (event) => {
      const data = JSON.parse(event.data) as DashboardPayload
      setPayload(data)
      setSelectedVehicleId((c) => c ?? data.priorityQueue[0]?.vehicleId ?? null)
    }
    sse.onerror = () => sse.close()
    return () => sse.close()
  }, [load])

  const selected = useMemo(
    () => payload?.vehicles.find((v) => v.id === selectedVehicleId) ?? payload?.vehicles[0] ?? null,
    [payload, selectedVehicleId]
  )

  const openRequests = payload?.serviceRequests.filter((r) => r.status !== "CLOSED") ?? []

  const api = async (path: string, method: "POST" | "PATCH" = "POST", body?: object) => {
    await fetch(`${apiBase}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
  }

  const fetchDispatchPlan = async (vehicleId: string) => {
    setBusyKey(`p:${vehicleId}`)
