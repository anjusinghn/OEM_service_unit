"use client"
import Link from "next/link"
import { useDashboardStore } from "@/stores/dashboard-store"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/cn"

export function PriorityQueuePreview() {
  const vehicles = useDashboardStore((s) => s.vehicles)
  const priorityQueue = useDashboardStore((s) => s.priorityQueue)

  const top10 = priorityQueue.slice(0, 10)

  if (top10.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">No vehicles in priority queue.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="divide-y divide-border">
        {top10.map((entry, idx) => {
          const vehicle = vehicles.find((v) => v.id === entry.vehicleId)
          if (!vehicle) return null
          return (
            <Link
              key={entry.vehicleId}
              href="/triage"
              className={cn(
                "flex items-center gap-3 px-1 py-2.5 transition-colors duration-150",
                "hover:bg-muted/50 rounded"
              )}
            >
              <span className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                entry.status === "critical" ? "bg-critical-muted text-critical" :
                entry.status === "watch" ? "bg-watch-muted text-watch" :
                "bg-muted text-muted-foreground"
              )}>
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-semibold text-foreground">{vehicle.vin}</p>
                <p className="truncate text-[11px] text-muted-foreground">{vehicle.model}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={entry.status} />
                <span className="w-8 text-right text-xs font-bold tabular-nums text-foreground">
                  {Math.round(entry.score)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <Link
          href="/triage"
          className="flex items-center justify-end text-xs font-medium text-primary hover:underline"
        >
          View full queue →
        </Link>
      </div>
    </div>
  )
}
