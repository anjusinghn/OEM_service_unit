import { chennaiWorkshops, type Depot } from "@kaz/shared"
import { cn } from "@/lib/cn"

export function DepotCard({ depot }: { depot: Depot }) {
  const workshop = chennaiWorkshops.find((entry) => entry.id === depot.id)
  const open = depot.totalBays - depot.occupiedBays
  const utilization = depot.totalBays > 0 ? (depot.occupiedBays / depot.totalBays) * 100 : 0
  const tone = utilization > 85 ? "critical" : utilization > 60 ? "watch" : "healthy"

  return (
    <div className="glass-card rounded-xl p-5 transition-all duration-200 hover:bg-glass-hover">
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

      {workshop && (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p>{workshop.address}</p>
          <p>
            <a href={workshop.source} target="_blank" rel="noreferrer" className="underline underline-offset-2">Workshop listing</a>
            {workshop.pin === "approximate" && " · Approximate location"}
            {" · Simulated capacity and capabilities"}
          </p>
        </div>
      )}

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
          <span key={s} className="rounded-md bg-glass px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}
