"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { useDashboardStore } from "@/stores/dashboard-store"
import { cn } from "@/lib/cn"
import { SectionCard } from "@/components/shared/section-card"
import { Users, Loader2 } from "lucide-react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest, Technician } from "@kaz/shared"
import type { VehicleRecord } from "@/stores/dashboard-store"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  technicians?: Technician[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

export default function TechniciansPage() {
  const storeTechnicians = useDashboardStore((s) => s.technicians)
  const [loading, setLoading] = useState(storeTechnicians.length === 0)

  useEffect(() => {
    if (storeTechnicians.length > 0) return
    apiFetch<DashboardPayload>("/api/v1/dashboard")
      .then((data) => useDashboardStore.getState().setSnapshot(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [storeTechnicians.length])

  const technicians = storeTechnicians

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><span className="text-watch">Technicians</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Team roster, certifications, and workload distribution.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-sm">Loading technician data...</span>
        </div>
      ) : technicians.length > 0 ? (
        <SectionCard title="Roster" description={`${technicians.length} technicians across all depots`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Depot</th>
                  <th className="pb-3 pr-4">Certifications</th>
                  <th className="pb-3 pr-4">Workload</th>
                  <th className="pb-3">FTF Rate</th>
                </tr>
