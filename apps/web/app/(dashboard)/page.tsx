"use client"

import { useEffect } from "react"
import { RefreshCw } from "lucide-react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, IntelligenceSnapshot, ServiceRequest } from "@kaz/shared"
import { useDashboardStore } from "@/stores/dashboard-store"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { apiFetch, apiPost } from "@/lib/api-client"
import { SectionCard } from "@/components/shared/section-card"
import { MetricCardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/shared/loading-skeleton"
import { MetricCard } from "@/components/fleet/metric-card"
import { HealthDonut } from "@/components/fleet/health-donut"
import { PriorityQueuePreview } from "@/components/fleet/priority-queue-preview"
import { AiEscalationCard } from "@/components/fleet/ai-escalation-card"
import { AlertList } from "@/components/fleet/alert-list"
import { LiveFeed } from "@/components/fleet/live-feed"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

export default function CommandCenterPage() {
  const overview = useDashboardStore((s) => s.overview)
  const priorityQueue = useDashboardStore((s) => s.priorityQueue)
  const alerts = useDashboardStore((s) => s.alerts)
  const aiEscalations = useDashboardStore((s) => s.aiEscalations)
  const livePulse = useDashboardStore((s) => s.livePulse)
  const sseConnected = useDashboardStore((s) => s.sseConnected)

  useEffect(() => {
    if (!overview) {
      apiFetch<DashboardPayload>("/api/v1/dashboard")
        .then((data) => {
          useDashboardStore.getState().setSnapshot(data)
        })
        .catch(() => {})
      apiFetch<IntelligenceSnapshot>("/api/v1/intelligence")
        .then((data) => {
          useDashboardStore.getState().setIntelligence(data)
        })
        .catch(() => {})
    }
  }, [overview])

  const handleReset = async () => {
    try {
      await apiPost<Record<string, unknown>>("/api/v1/demo/reset")
    } catch (_) {
      void _
    }
    window.location.reload()
  }

  const isLoading = !overview

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground"><span className="text-primary">Fleet</span> Command Center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time fleet health, triage, and dispatch overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${sseConnected ? "animate-pulse bg-healthy" : "bg-muted-foreground"}`} />
            <span className={`text-xs font-medium ${sseConnected ? "text-healthy" : "text-muted-foreground"}`}>
              {sseConnected ? "Live" : "Connecting"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 glass-card rounded-md px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            <RefreshCw className="h-3 w-3" />
            Reset demo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <MetricCard
              label="Vehicles monitored"
              value={overview.totalVehicles}
              detail={`${overview.healthyVehicles} healthy`}
              tone="default"
            />
            <MetricCard
              label="Needs service"
              value={overview.watchVehicles + overview.criticalVehicles}
              detail={`${overview.criticalVehicles} critical, ${overview.watchVehicles} watch`}
              tone={overview.criticalVehicles > 0 ? "critical" : "watch"}
            />
            <MetricCard
              label="First-time fix rate"
              value={`${Math.round(overview.firstTimeFixRate)}%`}
              detail={`${overview.openServiceRequests} open requests`}
              tone="healthy"
            />
            <MetricCard
              label="Bay utilization"
              value={`${Math.round(overview.bayUtilization)}%`}
              detail={`${overview.avgTurnaroundHours.toFixed(1)}h avg turnaround`}
              tone="default"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Health Distribution"
          description="Fleet-wide vehicle health breakdown"
          className="lg:col-span-2"
        >
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <HealthDonut
              healthy={overview.healthyVehicles}
              watch={overview.watchVehicles}
              critical={overview.criticalVehicles}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Priority Queue"
          description="Top vehicles by service urgency"
          action={
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {priorityQueue.length}
            </span>
          }
        >
          {isLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <PriorityQueuePreview />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="AI Escalations"
          description="Patterns and anomalies detected by AI"
          action={
            aiEscalations.length > 0 ? (
              <span className="rounded-full bg-critical-muted px-2 py-0.5 text-[11px] font-bold text-critical">
                {aiEscalations.length}
              </span>
            ) : undefined
          }
        >
          <AiEscalationCard escalations={aiEscalations} />
        </SectionCard>

        <SectionCard
          title="Active Alerts"
          description="Signal trust fault alerts"
          action={
            alerts.length > 0 ? (
              <span className="rounded-full bg-watch-muted px-2 py-0.5 text-[11px] font-bold text-watch">
                {alerts.length}
              </span>
            ) : undefined
          }
        >
          <AlertList alerts={alerts} />
        </SectionCard>
      </div>

      <SectionCard
        title="Live Activity Feed"
        description="Real-time fleet events and telemetry updates"
        action={
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-healthy" />
            <span className="text-[11px] font-medium text-healthy">Live</span>
          </div>
        }
      >
        <LiveFeed pulses={livePulse} />
      </SectionCard>
    </div>
  )
}
