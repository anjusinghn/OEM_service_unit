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
