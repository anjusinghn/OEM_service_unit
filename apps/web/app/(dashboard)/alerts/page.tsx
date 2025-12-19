"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { SectionCard } from "@/components/shared/section-card"
import { AiEscalationCard } from "@/components/fleet/ai-escalation-card"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/format"
import { AlertTriangle, ShieldAlert, Bell } from "lucide-react"

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><span className="text-watch">Alerts</span> & Escalations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {alerts.length} active alerts · {aiEscalations.length} AI escalations
        </p>
      </div>

      {aiEscalations.length > 0 && (
        <SectionCard title="AI Escalations" description="Issues flagged by the AI reasoning engine">
          <AiEscalationCard escalations={aiEscalations} />
        </SectionCard>
      )}

      <SectionCard title="Active Alerts" description="Real-time fault and degradation alerts from fleet telemetry">
        {alerts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => {
              const isCritical = alert.severity === "critical" || alert.severity === "safety"
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "flex items-start gap-3 glass-card rounded-xl border-l-2 p-3 transition-colors hover:bg-glass-hover/50",
                    isCritical ? "border-l-critical" : "border-l-watch",
                  )}
                >
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    isCritical ? "bg-critical-muted text-critical" : "bg-watch-muted text-watch",
                  )}>
                    {isCritical ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {alert.vehicleId} · {alert.subsystem} · {alert.count} occurrences
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatRelativeTime(alert.occurredAt)}
                    </p>
                  </div>
                  <span className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    isCritical ? "bg-critical-muted text-critical" : "bg-watch-muted text-watch",
                  )}>
                    {alert.severity}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No active alerts.</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
