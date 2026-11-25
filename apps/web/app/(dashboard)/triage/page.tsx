"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import { useDashboardStore } from "@/stores/dashboard-store"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { PageHeader } from "@/components/shared/page-header"
import { PriorityTable } from "@/components/triage/priority-table"
import { cn } from "@/lib/cn"

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
        .then((data) => useDashboardStore.getState().setSnapshot(data))
        .catch(() => {})
    }
  }, [overview])

  const counts = useMemo(() => {
    const c = { all: vehicles.length, critical: 0, watch: 0, healthy: 0 }
    for (const v of vehicles) c[v.health.status] += 1
    return c
  }, [vehicles])

  const filtered = useMemo(() => {
    let list = vehicles
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (v) => v.id.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q) || v.model.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== "all") list = list.filter((v) => v.health.status === statusFilter)
    return list
  }, [vehicles, search, statusFilter])

  const filteredQueue = useMemo(() => {
    const ids = new Set(filtered.map((v) => v.id))
    return priorityQueue.filter((e) => ids.has(e.vehicleId))
  }, [priorityQueue, filtered])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Triage queue"
        title={
          <>
            Service the <span className="text-gradient">right truck first.</span>
          </>
        }
        description="Vehicles ranked by safety, failure risk, and business impact. Select a row to see subsystem health and the AI's reasoning. Use J and K to move, Enter to expand."
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass-card flex flex-wrap items-center gap-1 rounded-xl p-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-accent text-foreground shadow-[inset_0_0_0_1px_rgb(89_175_212/0.25)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
              <span className="font-mono text-xs text-faint">{counts[s]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
          <input
            type="text"
            placeholder="Search VIN, ID or model"
            value={search}
            maxLength={64}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input h-12 w-full rounded-xl pl-11 pr-4 text-[15px] lg:w-80"
          />
        </div>
      </div>

      <PriorityTable vehicles={filtered} priorityQueue={filteredQueue} />
    </div>
  )
}
