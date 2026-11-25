"use client"

import { useEffect, useState } from "react"
import { HardHat, Loader2 } from "lucide-react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest, Technician } from "@kaz/shared"
import { apiFetch } from "@/lib/api-client"
import { useDashboardStore } from "@/stores/dashboard-store"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { cn } from "@/lib/cn"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  technicians?: Technician[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function TechniciansPage() {
  const technicians = useDashboardStore((s) => s.technicians)
  const [loading, setLoading] = useState(technicians.length === 0)

  useEffect(() => {
    if (technicians.length > 0) return
    apiFetch<DashboardPayload>("/api/v1/dashboard")
      .then((data) => useDashboardStore.getState().setSnapshot(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [technicians.length])

  const th = "pb-4 pr-6 font-mono text-xs font-medium uppercase tracking-[0.12em] text-faint"

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Technicians"
        title={
          <>
            The people who <span className="text-gradient">close the loop.</span>
          </>
        }
        description="Certifications, current workload, and first-time fix rate for every technician in the network."
        actions={technicians.length > 0 && <span className="chip">{technicians.length} technicians</span>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          <span className="text-base">Loading technicians…</span>
        </div>
      ) : technicians.length > 0 ? (
        <SectionCard title="Roster" description="Sorted as assigned across depots">
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[820px] text-[15px]">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className={th}>Technician</th>
                  <th className={th}>Depot</th>
                  <th className={th}>Certifications</th>
                  <th className={th}>Workload</th>
                  <th className={cn(th, "pr-0 text-right")}>First-time fix</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((tech) => {
                  const loadPct = tech.maxLoad > 0 ? (tech.currentLoad / tech.maxLoad) * 100 : 0
                  const ftf = Math.round(tech.firstTimeFixRate * 100)
                  return (
                    <tr key={tech.id} className="border-b border-border last:border-0">
                      <td className="py-4 pr-6">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-500/25 bg-accent font-mono text-sm text-sky-300">
                            {initials(tech.name)}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{tech.name}</p>
                            <p className="font-mono text-sm text-faint">{tech.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-6 font-mono text-muted-foreground">{tech.depotId}</td>
                      <td className="py-4 pr-6">
                        <div className="flex flex-wrap gap-1.5">
                          {tech.certifications.map((c) => (
                            <span key={c} className="chip capitalize">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 pr-6">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-white/[0.06]">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                loadPct > 80 ? "bg-critical" : "bg-gradient-to-r from-sky-600 to-sky-300"
                              )}
                              style={{ width: `${loadPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm text-muted-foreground">
                            {tech.currentLoad}/{tech.maxLoad}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <span className={cn("stat text-xl", ftf < 70 ? "text-critical" : "text-foreground")}>{ftf}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl py-20 text-muted-foreground">
          <HardHat className="mb-4 h-10 w-10 text-faint" strokeWidth={1.5} />
          <p className="text-base">No technician data yet.</p>
        </div>
      )}
    </div>
  )
}
