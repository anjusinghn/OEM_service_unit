"use client"

import { useDashboardStore } from "@/stores/dashboard-store"
import { KanbanCard } from "./kanban-card"
import { cn } from "@/lib/cn"
import type { ServiceRequestStatus } from "@kaz/shared"

const COLUMNS: ServiceRequestStatus[] = [
  "DETECTED",
  "PRIORITIZED",
  "DEPOT_ASSIGNED",
  "PARTS_CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
]

const COLUMN_LABELS: Record<ServiceRequestStatus, string> = {
  DETECTED: "Detected",
  PRIORITIZED: "Prioritized",
  DEPOT_ASSIGNED: "Depot Assigned",
  TECHNICIAN_ASSIGNED: "Tech Assigned",
  PARTS_CONFIRMED: "Parts Confirmed",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CLOSED: "Closed",
}

export function KanbanBoard() {
  const serviceRequests = useDashboardStore((s) => s.serviceRequests)
  const vehicles = useDashboardStore((s) => s.vehicles)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const items = serviceRequests.filter((r) => r.status === col)
        return (
          <div key={col} className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {COLUMN_LABELS[col]}
              </span>
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  items.length > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((req) => {
                const vehicle = vehicles.find((v) => v.id === req.vehicleId)
                return <KanbanCard key={req.id} request={req} vehicle={vehicle} />
              })}
              {items.length === 0 && (
                <div className="flex items-center justify-center rounded-md border border-dashed border-border py-8 text-xs text-muted-foreground">
                  No requests
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
