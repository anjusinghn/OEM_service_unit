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
              </thead>
              <tbody>
                {technicians.map((tech) => {
                  const loadPct = tech.maxLoad > 0 ? (tech.currentLoad / tech.maxLoad) * 100 : 0
                  return (
                    <tr key={tech.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{tech.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">{tech.id}</p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{tech.depotId}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {tech.certifications.map((c) => (
                            <span key={c} className="rounded-md bg-glass px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                loadPct > 80 ? "bg-critical" : loadPct > 50 ? "bg-watch" : "bg-healthy",
                              )}
                              style={{ width: `${loadPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {tech.currentLoad}/{tech.maxLoad}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={cn(
                          "font-mono text-xs font-semibold",
                          tech.firstTimeFixRate >= 0.9 ? "text-healthy" : tech.firstTimeFixRate >= 0.7 ? "text-watch" : "text-critical",
                        )}>
                          {Math.round(tech.firstTimeFixRate * 100)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <div className="flex flex-col items-center justify-center glass-card rounded-lg border-dashed py-16 text-muted-foreground">
          <Users className="mb-3 h-8 w-8 text-watch/40" />
          <p className="text-sm">No technician data available. Connect to a running API.</p>
        </div>
      )}
    </div>
  )
}
