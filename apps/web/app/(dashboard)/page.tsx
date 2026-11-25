"use client"

import { useEffect } from "react"
import { Activity, Gauge, Truck, Wrench } from "lucide-react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, IntelligenceSnapshot, ServiceRequest } from "@kaz/shared"
import { useDashboardStore } from "@/stores/dashboard-store"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { PageHeader } from "@/components/shared/page-header"
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

function CountChip({ value, tone }: { value: number; tone: "critical" | "watch" | "default" }) {
  const styles = {
    critical: "border-critical/25 bg-critical-muted text-critical",
    watch: "border-watch/25 bg-watch-muted text-watch",
    default: "border-border bg-white/5 text-muted-foreground",
  }
  return <span className={`rounded-full border px-3 py-1 font-mono text-sm font-medium ${styles[tone]}`}>{value}</span>
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
        .then((data) => useDashboardStore.getState().setSnapshot(data))
        .catch(() => {})
      apiFetch<IntelligenceSnapshot>("/api/v1/intelligence")
        .then((data) => useDashboardStore.getState().setIntelligence(data))
        .catch(() => {})
    }
  }, [overview])

  const isLoading = !overview

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Command center"
        title={
          <>
            Every vehicle, <span className="text-gradient">one live view.</span>
          </>
        }
        description="Fleet health, triage priority, and dispatch activity streamed from telemetry in real time."
        actions={
          <span className="chip">
            <span className={`h-2 w-2 rounded-full ${sseConnected ? "animate-pulse bg-healthy" : "bg-faint"}`} />
            {sseConnected ? "Streaming telemetry" : "Connecting to stream"}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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
              label="Vehicles"
              value={overview.totalVehicles}
              detail={`${overview.healthyVehicles} running healthy`}
              icon={Truck}
            />
            <MetricCard
              label="Needs service"
              value={overview.watchVehicles + overview.criticalVehicles}
              detail={`${overview.criticalVehicles} critical · ${overview.watchVehicles} on watch`}
              tone={overview.criticalVehicles > 0 ? "critical" : "watch"}
              icon={Wrench}
            />
            <MetricCard
              label="First-time fix"
              value={`${Math.round(overview.firstTimeFixRate)}%`}
              detail={`${overview.openServiceRequests} open service requests`}
              tone="healthy"
              icon={Activity}
            />
            <MetricCard
              label="Bay usage"
              value={`${Math.round(overview.bayUtilization)}%`}
              detail={`${overview.avgTurnaroundHours.toFixed(1)}h average turnaround`}
              icon={Gauge}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <SectionCard
          title="Health distribution"
          description="Fleet-wide breakdown by vehicle condition"
          className="xl:col-span-2"
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
          title="Priority queue"
          description="Vehicles ranked by service urgency"
          className="xl:col-span-3"
          action={<CountChip value={priorityQueue.length} tone="default" />}
        >
          {isLoading ? <TableSkeleton rows={6} /> : <PriorityQueuePreview />}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="AI escalations"
          description="Patterns and anomalies flagged by the reasoning engine"
          action={aiEscalations.length > 0 ? <CountChip value={aiEscalations.length} tone="critical" /> : undefined}
        >
          <AiEscalationCard escalations={aiEscalations} />
        </SectionCard>

        <SectionCard
          title="Active alerts"
          description="Fault and signal-trust alerts from the fleet"
          action={alerts.length > 0 ? <CountChip value={alerts.length} tone="watch" /> : undefined}
        >
          <AlertList alerts={alerts} />
        </SectionCard>
      </div>

      <SectionCard
        title="Live activity"
        description="Telemetry, dispatch, and repair events as they happen"
        action={
          <span className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.12em] text-healthy">
            <span className="h-2 w-2 animate-pulse rounded-full bg-healthy" />
            Live
          </span>
        }
      >
        <LiveFeed pulses={livePulse} />
      </SectionCard>
    </div>
  )
}
