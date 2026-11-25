"use client"

import { useEffect } from "react"
import { BellRing, ShieldAlert, TriangleAlert } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/format"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { AiEscalationCard } from "@/components/fleet/ai-escalation-card"

export default function AlertsPage() {
  const alerts = useDashboardStore((s) => s.alerts)
  const aiEscalations = useDashboardStore((s) => s.aiEscalations)
  const overview = useDashboardStore((s) => s.overview)

  useEffect(() => {
    if (!overview) {
      apiFetch<any>("/api/v1/dashboard")
        .then((data) => useDashboardStore.getState().setSnapshot(data))
        .catch(() => {})
    }
  }, [overview])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Alerts"
        title={
          <>
            Signals that <span className="text-gradient">need a human.</span>
          </>
        }
        description="Fault and degradation alerts from fleet telemetry, plus anything the AI escalated."
        actions={
          <span className="chip">
            {alerts.length} alerts · {aiEscalations.length} escalations
          </span>
        }
      />

      {aiEscalations.length > 0 && (
        <SectionCard title="AI escalations" description="Issues flagged by the reasoning engine">
          <AiEscalationCard escalations={aiEscalations} />
        </SectionCard>
      )}

      <SectionCard title="Active alerts" description="Newest first, straight from vehicle telemetry">
        {alerts.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {alerts.map((alert) => {
              const isCritical = alert.severity === "critical" || alert.severity === "safety"
              return (
                <div key={alert.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                      isCritical ? "border-critical/30 bg-critical-muted text-critical" : "border-border bg-white/[0.04] text-watch"
                    )}
                  >
                    {isCritical ? <ShieldAlert size={20} strokeWidth={1.75} /> : <TriangleAlert size={20} strokeWidth={1.75} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-foreground">{alert.title}</p>
                    <p className="mt-1 text-[15px] text-muted-foreground">
                      <span className="font-mono">{alert.vehicleId}</span> · <span className="capitalize">{alert.subsystem}</span> ·{" "}
                      {alert.count} occurrences
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium capitalize",
                        isCritical ? "border-critical/30 bg-critical-muted text-frost" : "border-border bg-white/[0.04] text-muted-foreground"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", isCritical ? "bg-critical" : "bg-watch")} />
                      {alert.severity}
                    </span>
                    <span className="font-mono text-sm text-faint">{formatRelativeTime(alert.occurredAt)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <BellRing className="mb-4 h-10 w-10 text-faint" strokeWidth={1.5} />
            <p className="text-base">No active alerts.</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
