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
    try {
      const response = await fetch(`${apiBase}/api/v1/orchestration/vehicles/${vehicleId}/dispatch-plan`, { cache: "no-store" })
      if (!response.ok) throw new Error("dispatch plan fetch failed")
      setDispatchPlan((await response.json()) as AiDispatchPlan)
    } finally {
      setBusyKey(null)
    }
  }

  const dispatch = async (vehicleId: string) => {
    setBusyKey(`d:${vehicleId}`)
    await api(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch`)
    setBusyKey(null)
    await load()
  }

  const advance = async (requestId: string) => {
    setBusyKey(`a:${requestId}`)
    await api(`/api/v1/service-requests/${requestId}/status`, "PATCH", {})
    setBusyKey(null)
    await load()
  }

  const complete = async (requestId: string) => {
    setBusyKey(`c:${requestId}`)
    await api(`/api/v1/service-requests/${requestId}/complete`)
    setBusyKey(null)
    await load()
  }

  const reset = async () => {
    setBusyKey("reset")
    await api("/api/v1/demo/reset")
    setBusyKey(null)
    await load()
  }

  /* ── Loading state ── */
  if (!payload) {
    return (
      <div className="loading-screen">
        <LoaderCircle size={28} className="loading-screen__spinner" />
        <span className="loading-screen__text">{error ?? "Connecting to orchestration layer..."}</span>
      </div>
    )
  }

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">K</div>
          <div className="sidebar__brand-text">
            <span className="sidebar__name">kazindustries</span>
            <span className="sidebar__env">Phase 1 Demo</span>
          </div>
        </div>

        <div className="sidebar__section">
          <span className="sidebar__section-label">Platform</span>
          <nav className="sidebar__nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`sidebar__item${activeNav === item.id ? " sidebar__item--active" : ""}`}
                onClick={() => { setActiveNav(item.id); setSidebarOpen(false) }}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar__divider" />

        <div className="sidebar__footer">
          {NAV_FOOTER.map((item) => (
            <button
              key={item.id}
              type="button"
              className="sidebar__item"
              onClick={() => { setActiveNav(item.id); setSidebarOpen(false) }}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="content">
        <div className="content__inner">
          {/* Mobile header */}
          <div className="mobile-header">
            <div className="mobile-header__brand">
              <div className="mobile-header__logo">K</div>
              <span className="mobile-header__name">kazindustries</span>
            </div>
            <button type="button" className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Page header */}
          <div className="page-header fade-in fade-in-1">
            <div className="page-header__left">
              <h1>Service Orchestration</h1>
              <p>
                Real-time fleet triage, depot matching, and service workflow management.
                Every decision is explainable and auditable.
              </p>
            </div>
            <div className="page-header__actions">
              <div className="live-indicator">Live</div>
              <button type="button" className="button" onClick={reset} disabled={busyKey === "reset"}>
                Reset demo
              </button>
            </div>
          </div>

          {/* Metrics row */}
          <div className="metric-grid fade-in fade-in-2">
            <MetricCard
              label="Healthy vehicles"
              value={payload.overview.healthyVehicles}
              detail={`of ${payload.overview.totalVehicles} total`}
              tone="success"
            />
            <MetricCard
              label="Needs attention"
              value={payload.overview.watchVehicles + payload.overview.criticalVehicles}
              detail="watch + critical"
              tone={payload.overview.criticalVehicles > 0 ? "critical" : "watch"}
