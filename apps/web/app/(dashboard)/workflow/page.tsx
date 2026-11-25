"use client"

import { useEffect } from "react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import { useDashboardStore } from "@/stores/dashboard-store"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { PageHeader } from "@/components/shared/page-header"
import { KanbanBoard } from "@/components/workflow/kanban-board"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

export default function WorkflowPage() {
  const overview = useDashboardStore((s) => s.overview)
  const serviceRequests = useDashboardStore((s) => s.serviceRequests)

  useEffect(() => {
    if (!overview) {
      apiFetch<DashboardPayload>("/api/v1/dashboard")
        .then((data) => useDashboardStore.getState().setSnapshot(data))
        .catch(() => {})
    }
  }, [overview])

  const open = serviceRequests.filter((r) => r.status !== "COMPLETED" && r.status !== "CLOSED").length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Service workflow"
        title={
          <>
            Detection to <span className="text-gradient">done, in one board.</span>
          </>
        }
        description="Each service request moves left to right through its lifecycle, from the first fault signal to a completed repair."
        actions={<span className="chip">{open} open requests</span>}
      />
      <KanbanBoard />
    </div>
  )
}
