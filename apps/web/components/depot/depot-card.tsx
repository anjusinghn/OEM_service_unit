import type { Depot } from "@kaz/shared"
import { cn } from "@/lib/cn"

export function DepotCard({ depot }: { depot: Depot }) {
  const open = depot.totalBays - depot.occupiedBays
  const utilization = depot.totalBays > 0 ? (depot.occupiedBays / depot.totalBays) * 100 : 0
  const tone = utilization > 85 ? "critical" : utilization > 60 ? "watch" : "healthy"

  return (
    <div className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{depot.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{depot.city} · {depot.region}</p>
        </div>
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
          tone === "healthy" && "bg-healthy-muted text-healthy",
          tone === "watch" && "bg-watch-muted text-watch",
          tone === "critical" && "bg-critical-muted text-critical",
        )}>
          {open} open
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Bay utilization</span>
          <span className="font-mono">{depot.occupiedBays}/{depot.totalBays}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              tone === "healthy" && "bg-healthy",
              tone === "watch" && "bg-watch",
              tone === "critical" && "bg-critical",
            )}
            style={{ width: `${utilization}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {depot.specialties.map((s) => (
          <span key={s} className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
