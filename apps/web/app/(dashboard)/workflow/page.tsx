"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { KanbanBoard } from "@/components/workflow/kanban-board"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import type { VehicleRecord } from "@/stores/dashboard-store"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

export default function WorkflowPage() {
  const overview = useDashboardStore((s) => s.overview)

  useEffect(() => {
    if (!overview) {
      apiFetch<DashboardPayload>("/api/v1/dashboard")
        .then((data) => {
          useDashboardStore.getState().setSnapshot(data)
        })
        .catch(() => {})
    }
  }, [overview])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><span className="text-info">Service</span> Workflow</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track service requests through the full lifecycle. Advance or complete requests from each card.
        </p>
      </div>

      <KanbanBoard />
    </div>
  )
}
