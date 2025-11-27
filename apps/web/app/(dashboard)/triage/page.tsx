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
