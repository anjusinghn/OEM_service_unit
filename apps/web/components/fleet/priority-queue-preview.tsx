"use client"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { StatusBadge } from "@/components/shared/status-badge"
import { cn } from "@/lib/cn"

export function PriorityQueuePreview() {
  const vehicles = useDashboardStore((s) => s.vehicles)
  const priorityQueue = useDashboardStore((s) => s.priorityQueue)
  const top = priorityQueue.slice(0, 8)

  if (top.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No vehicles in the priority queue.</p>
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border">
        {top.map((entry, idx) => {
          const vehicle = vehicles.find((v) => v.id === entry.vehicleId)
          if (!vehicle) return null
          return (
            <Link
              key={entry.vehicleId}
              href="/triage"
              className="group -mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-glass-hover"
            >
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-medium",
                  entry.status === "critical"
                    ? "border-critical/30 bg-critical-muted text-critical"
                    : "border-border bg-white/[0.04] text-muted-foreground"
                )}
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm font-medium text-foreground">{vehicle.vin}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {vehicle.model} · {vehicle.region}
                </p>
              </div>
              <StatusBadge status={entry.status} />
              <span className="stat w-12 text-right text-xl text-foreground">{Math.round(entry.score)}</span>
            </Link>
          )
        })}
      </div>
      <Link
        href="/triage"
        className="mt-4 inline-flex items-center gap-2 self-end text-sm font-medium text-sky-400 transition-colors hover:text-sky-300"
      >
        Open triage queue <ArrowRight size={16} />
      </Link>
    </div>
  )
}
