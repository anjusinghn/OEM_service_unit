"use client"
import Link from "next/link"
import { ArrowRight, ShieldAlert, TriangleAlert } from "lucide-react"
import type { Alert } from "@kaz/shared"
import { cn } from "@/lib/cn"

interface AlertListProps {
  alerts: Alert[]
}

export function AlertList({ alerts }: AlertListProps) {
  const shown = alerts.slice(0, 6)

  if (shown.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No active alerts.</p>
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border">
        {shown.map((alert) => {
          const isCritical = alert.severity === "critical" || alert.severity === "safety"
          return (
            <div key={alert.id} className="flex items-start gap-4 py-3.5 first:pt-0">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                  isCritical ? "border-critical/25 bg-critical-muted text-critical" : "border-watch/25 bg-watch-muted text-watch"
                )}
              >
                {isCritical ? <ShieldAlert size={19} strokeWidth={1.75} /> : <TriangleAlert size={19} strokeWidth={1.75} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-foreground">{alert.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-mono">{alert.vehicleId}</span> · <span className="capitalize">{alert.subsystem}</span> ·{" "}
                  {alert.count} occurrences
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <Link
        href="/alerts"
        className="mt-4 inline-flex items-center gap-2 self-end text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
      >
        View all alerts <ArrowRight size={16} />
      </Link>
    </div>
  )
}
