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
            />
            <MetricCard
              label="Open requests"
              value={payload.overview.openServiceRequests}
              detail={`${payload.overview.avgTurnaroundHours}h avg turnaround`}
            />
            <MetricCard
              label="Bay utilization"
              value={`${payload.overview.bayUtilization}%`}
              detail={`${payload.overview.firstTimeFixRate}% first-time-fix`}
            />
            <MetricCard
              label="Forensics anomalies"
              value={payload.forensics.anomalies.length}
              detail={`${payload.forensics.investigations.length} open investigations`}
              tone={payload.forensics.anomalies.length > 0 ? "watch" : "success"}
            />
            <MetricCard
              label="Decision quality"
              value={intelligence ? `${Math.round((intelligence.qualityTrend[0]?.aiScore ?? 0) * 100)}%` : "\u2014"}
              detail={intelligence ? `${Math.round(intelligence.overrideRate * 100)}% override rate` : "learning pending"}
              tone="success"
            />
          </div>

          {/* Main grid: priority queue + decision card */}
          <div className="grid grid--main mb-28 fade-in fade-in-3">
            <SectionCard title="Priority Queue" eyebrow="Triage">
              <div className="priority-list">
                {payload.priorityQueue.slice(0, 14).map((entry, idx) => {
                  const v = payload.vehicles.find((x) => x.id === entry.vehicleId)
                  if (!v) return null
                  return (
                    <button
                      key={entry.vehicleId}
                      type="button"
                      className={`priority-row${selectedVehicleId === entry.vehicleId ? " priority-row--active" : ""}`}
                      onClick={() => setSelectedVehicleId(entry.vehicleId)}
                    >
                      <div className="priority-row__rank">{idx + 1}</div>
                      <div className="priority-row__body">
                        <strong>{v.vin}</strong>
                        <span>{v.model} / {v.region}</span>
                      </div>
                      <div className="priority-row__meta">
                        <StatusPill tone={toneFromHealth(v.health.status)}>{v.health.status}</StatusPill>
                        <strong>{entry.score}</strong>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard title="Vehicle Decision Card" eyebrow="Explainability">
              {selected ? (
                <>
                  <div className="decision-header">
                    <div>
                      <h3>{selected.vin}</h3>
                      <p>{selected.model} &middot; {selected.routeName} &middot; {selected.buildBatch}</p>
                    </div>
                    <StatusPill tone={toneFromHealth(selected.health.status)}>
                      {selected.health.status}
                    </StatusPill>
                  </div>

                  <div className="health-strip">
                    <div className="health-strip__item">
                      <span>Health</span>
                      <strong>{selected.health.overall}</strong>
                    </div>
                    <div className="health-strip__item">
                      <span>Signal quality</span>
                      <strong>{selected.health.signalQuality}</strong>
                    </div>
                    <div className="health-strip__item">
                      <span>Trend</span>
                      <strong>{selected.health.trend}</strong>
                    </div>
                    <div className="health-strip__item">
                      <span>Priority</span>
                      <strong>{selected.priority?.score ?? "\u2014"}</strong>
                    </div>
                  </div>

                  {selected.priority?.breakdown.reasons.length ? (
                    <div className="reason-grid">
                      {selected.priority.breakdown.reasons.map((r) => (
                        <div className="reason-chip" key={r}>{r}</div>
                      ))}
                    </div>
                  ) : null}

                  {selected.priority?.breakdown.aiAssessment ? (
                    <div className="recommendation-card" style={{ marginBottom: 20 }}>
                      <span>AI priority assessment</span>
                      <strong>
                        {selected.priority.breakdown.aiAssessment.urgency} · {selected.priority.breakdown.aiAssessment.adjustedScore}
                      </strong>
                      <p>{selected.priority.breakdown.aiAssessment.recommendation}</p>
                    </div>
                  ) : null}

                  <div className="subsystem-section-title">Subsystem health</div>
                  <div className="subsystem-grid">
                    {Object.entries(selected.health.subsystems).map(([sys, score]) => (
                      <div key={sys} className="subsystem-row">
                        <span>{sys}</span>
                        <div className="subsystem-bar">
                          <span style={{
                            width: `${score}%`,
                            background: score < 55 ? "var(--critical)" : score < 78 ? "var(--warning)" : "var(--success)"
                          }} />
                        </div>
                        <strong>{score}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="fault-stack">
                    <div className="fault-section-title">Active fault codes</div>
                    {selected.faults.length ? selected.faults.map((f) => (
                      <div key={f.id} className="fault-card">
                        <div>
                          <strong>{f.dtcCode}</strong>
                          <p>{f.title}</p>
                        </div>
                        <StatusPill tone={f.severity === "critical" || f.severity === "safety" ? "critical" : "watch"}>
                          {f.severity}
                        </StatusPill>
                      </div>
                    )) : (
                      <div className="fault-card fault-card--empty">
                        No active DTCs. Ranked by degradation trend and operational impact.
                      </div>
                    )}
                  </div>

                  <div className="recommendation-grid">
                    <div className="recommendation-card">
                      <span>Recommended depot</span>
                      <strong>{selected.depotRecommendations?.[0]?.depotId ?? "\u2014"}</strong>
                      <p>{selected.depotRecommendations?.[0]?.aiAssessment?.reasoning ?? selected.depotRecommendations?.[0]?.reasons.join(" \u00b7 ")}</p>
                    </div>
                    <div className="recommendation-card">
                      <span>Parts readiness</span>
                      <strong>{selected.depotRecommendations?.[0]?.partsReady ? "All in stock" : "Transfer needed"}</strong>
                      <p>{selected.depotRecommendations?.[0]?.requiredParts.map((p) => p.name).join(", ")}</p>
                    </div>
                  </div>

                  <div className="decision-actions">
                    <button
                      type="button"
                      className="button button--primary"
                      onClick={() => dispatch(selected.id)}
                      disabled={busyKey === `d:${selected.id}` || Boolean(selected.currentRequest)}
                    >
                      <Wrench size={14} />
                      {selected.currentRequest ? "Already dispatched" : "Dispatch to workflow"}
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => fetchDispatchPlan(selected.id)}
                      disabled={busyKey === `p:${selected.id}`}
                    >
                      AI dispatch plan
                    </button>
                    <span className="hint">Creates a service request with the recommended depot and staged parts.</span>
                  </div>

                  {dispatchPlan ? (
                    <div className="recommendation-grid" style={{ marginTop: 18 }}>
                      <div className="recommendation-card">
                        <span>Dispatch depot</span>
                        <strong>{dispatchPlan.depotId}</strong>
                        <p>{dispatchPlan.depotReasoning}</p>
                      </div>
                      <div className="recommendation-card">
                        <span>Parts to stage</span>
                        <strong>{dispatchPlan.partsToStage.length}</strong>
                        <p>{dispatchPlan.partsToStage.join(", ") || "No staging list required."}</p>
                      </div>
                      <div className="recommendation-card">
                        <span>Watch points</span>
                        <strong>{dispatchPlan.urgencyLevel}</strong>
                        <p>{dispatchPlan.watchPoints.join(", ")}</p>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </SectionCard>
          </div>

          {/* Service requests + depots */}
          <div className="grid grid--secondary mb-28 fade-in fade-in-4">
            <SectionCard
              title="Service Requests"
              eyebrow="Workflow"
              actions={<StatusPill tone="info">{openRequests.length} active</StatusPill>}
            >
              <div className="request-board">
                {openRequests.slice(0, 6).map((req) => {
                  const v = payload.vehicles.find((x) => x.id === req.vehicleId)
                  return (
                    <article key={req.id} className="request-card">
                      <div className="request-card__top">
                        <div>
                          <strong>{req.id}</strong>
                          <p>{v?.vin} &middot; {req.weakestSubsystem}</p>
                        </div>
                        <StatusPill tone={toneFromRequest(req.status)}>{req.status.toLowerCase().replace(/_/g, " ")}</StatusPill>
                      </div>
                      <div className="request-card__meta">
                        <span>{req.depotId ?? "\u2014"}</span>
                        <span>{req.technicianId ?? "\u2014"}</span>
                        <span>score {req.priorityScore}</span>
                      </div>
                      <div className="request-card__timeline">
                        {req.timeline.slice(-2).map((ev) => (
                          <div key={`${req.id}-${ev.status}-${ev.at}`}>
                            <strong>{ev.status}</strong>
                            <p>{ev.note}</p>
                          </div>
                        ))}
                      </div>
                      <div className="request-card__actions">
                        <button
                          type="button"
                          className="button button--sm"
                          onClick={() => advance(req.id)}
                          disabled={busyKey === `a:${req.id}` || req.status === "COMPLETED" || req.status === "CLOSED"}
                        >
                          <ArrowRight size={13} /> Advance
                        </button>
                        <button
                          type="button"
                          className="button button--ghost button--sm"
                          onClick={() => complete(req.id)}
                          disabled={busyKey === `c:${req.id}` || req.status === "COMPLETED" || req.status === "CLOSED"}
                        >
                          <PackageCheck size={13} /> Complete
                        </button>
                      </div>
                    </article>
                  )
                })}
                {openRequests.length === 0 && (
                  <div className="empty-state">
                    <GitBranch size={24} />
                    <span>No active service requests. Dispatch a vehicle to create one.</span>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Depot Network" eyebrow="Capacity">
              <div className="depot-grid">
                {payload.depots.map((depot) => {
                  const open = depot.totalBays - depot.occupiedBays
                  return (
                    <article className="depot-card" key={depot.id}>
                      <div className="depot-card__top">
                        <strong>{depot.name}</strong>
                        <StatusPill tone={open <= 2 ? "critical" : "success"}>{open} open</StatusPill>
                      </div>
                      <p>{depot.city} &middot; {depot.region}</p>
                      <div className="depot-specialties">
                        {depot.specialties.map((s) => (
                          <span key={s}>{s}</span>
                        ))}
