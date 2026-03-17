"use client"
import Link from "next/link"
import { ShieldAlert, AlertTriangle } from "lucide-react"
import type { Alert } from "@kaz/shared"
import { cn } from "@/lib/cn"

interface AlertListProps {
  alerts: Alert[]
}

export function AlertList({ alerts }: AlertListProps) {
  const shown = alerts.slice(0, 8)

  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">No active alerts.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border">
        {shown.map((alert) => {
          const isCritical = alert.severity === "critical" || alert.severity === "safety"
          return (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 border-l-2 py-3 pl-3 pr-1",
                isCritical ? "border-l-critical" : "border-l-watch"
              )}
            >
              <span className={cn(
                "mt-0.5 shrink-0",
                isCritical ? "text-critical" : "text-watch"
              )}>
                {isCritical
                  ? <ShieldAlert className="h-4 w-4" />
                  : <AlertTriangle className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {alert.vehicleId} · {alert.subsystem} · {alert.count} occ.
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {alerts.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <Link
            href="/alerts"
            className="flex items-center justify-end text-xs font-medium text-primary hover:underline"
          >
            View all alerts →
          </Link>
        </div>
      )}
    </div>
  )
}
