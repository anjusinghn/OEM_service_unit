"use client"

import { useEffect, useMemo, useState } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { PriorityTable } from "@/components/triage/priority-table"
import { Search } from "lucide-react"
import { cn } from "@/lib/cn"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import type { VehicleRecord } from "@/stores/dashboard-store"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

const STATUSES = ["all", "critical", "watch", "healthy"] as const

export default function TriagePage() {
  const vehicles = useDashboardStore((s) => s.vehicles)
  const priorityQueue = useDashboardStore((s) => s.priorityQueue)
  const overview = useDashboardStore((s) => s.overview)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all")

  useEffect(() => {
    if (!overview) {
      apiFetch<DashboardPayload>("/api/v1/dashboard")
        .then((data) => {
          useDashboardStore.getState().setSnapshot(data)
        })
        .catch(() => {})
    }
  }, [overview])

  const filtered = useMemo(() => {
    let list = [...vehicles]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          v.vin.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") {
      list = list.filter((v) => v.health.status === statusFilter)
    }
    return list
  }, [vehicles, search, statusFilter])

  const filteredQueue = useMemo(() => {
    const vehicleIds = new Set(filtered.map((v) => v.id))
    return priorityQueue.filter((e) => vehicleIds.has(e.vehicleId))
  }, [priorityQueue, filtered])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Triage Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Prioritized fleet vehicles ranked by service urgency. Click a row to expand AI reasoning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-56 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded px-3 py-1 text-xs font-medium capitalize transition-colors",
                  statusFilter === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <PriorityTable vehicles={filtered} priorityQueue={filteredQueue} />
    </div>
  )
}
