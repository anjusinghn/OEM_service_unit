"use client"

import type { ServiceRequestStatus } from "@kaz/shared"
import { useDashboardStore } from "@/stores/dashboard-store"
import { cn } from "@/lib/cn"
import { KanbanCard } from "./kanban-card"

const COLUMNS: { status: ServiceRequestStatus; label: string; dot: string }[] = [
  { status: "DETECTED", label: "Detected", dot: "bg-critical" },
  { status: "PRIORITIZED", label: "Prioritized", dot: "bg-watch" },
  { status: "DEPOT_ASSIGNED", label: "Depot assigned", dot: "bg-sky-500" },
  { status: "PARTS_CONFIRMED", label: "Parts confirmed", dot: "bg-sky-400" },
  { status: "TECHNICIAN_ASSIGNED", label: "Tech assigned", dot: "bg-sky-300" },
  { status: "SCHEDULED", label: "Scheduled", dot: "bg-ai" },
  { status: "IN_PROGRESS", label: "In progress", dot: "bg-watch" },
  { status: "COMPLETED", label: "Completed", dot: "bg-healthy" },
]

export function KanbanBoard() {
  const serviceRequests = useDashboardStore((s) => s.serviceRequests)
  const vehicles = useDashboardStore((s) => s.vehicles)

  return (
    <div className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-6 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
      {COLUMNS.map((col) => {
        const items = serviceRequests.filter((r) => r.status === col.status)
        return (
          <div key={col.status} className="glass-panel flex w-[320px] shrink-0 flex-col rounded-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                <h2 className="text-lg font-semibold text-foreground">{col.label}</h2>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 font-mono text-sm",
                  items.length > 0 ? "border-sky-500/25 bg-accent text-sky-300" : "border-border text-faint"
                )}
              >
                {items.length}
              </span>
            </div>
            <div className="flex max-h-[calc(100vh-340px)] min-h-[200px] flex-col gap-3 overflow-y-auto p-3">
              {items.map((req) => (
                <KanbanCard key={req.id} request={req} vehicle={vehicles.find((v) => v.id === req.vehicleId)} />
              ))}
              {items.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border py-10 text-sm text-faint">
                  Nothing here yet
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
