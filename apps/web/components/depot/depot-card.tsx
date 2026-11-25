import { chennaiWorkshops, type Depot } from "@kaz/shared"
import { MapPin, Warehouse } from "lucide-react"
import { cn } from "@/lib/cn"

export function DepotCard({ depot }: { depot: Depot }) {
  const workshop = chennaiWorkshops.find((entry) => entry.id === depot.id)
  const open = depot.totalBays - depot.occupiedBays
  const utilization = depot.totalBays > 0 ? (depot.occupiedBays / depot.totalBays) * 100 : 0
  const full = utilization > 85

  return (
    <div className="glass-panel flex flex-col gap-5 rounded-2xl p-6 transition-[transform,border-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-accent text-sky-400">
            <Warehouse size={22} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xl font-semibold text-foreground">{depot.name}</h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-[15px] text-muted-foreground">
              <MapPin size={15} className="text-faint" /> {depot.city} · {depot.region}
            </p>
          </div>
        </div>
      </div>

      {workshop && (
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{workshop.address}</p>
          <p>
            <a href={workshop.source} target="_blank" rel="noreferrer" className="text-sky-300 underline underline-offset-2">Workshop listing</a>
            {workshop.pin === "approximate" && " · Approximate location"}
            {" · Simulated capacity and capabilities"}
          </p>
        </div>
      )}

      <div className="flex items-end justify-between">
        <div>
          <p className="label">Bays open</p>
          <p className={cn("stat mt-1.5 text-[40px] leading-none", full ? "text-critical" : "text-foreground")}>
            {open}
            <span className="ml-1.5 font-sans text-base font-normal tracking-normal text-faint">of {depot.totalBays}</span>
          </p>
        </div>
        <p className="font-mono text-sm text-muted-foreground">{Math.round(utilization)}% used</p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={cn("h-full rounded-full transition-all", full ? "bg-critical" : "bg-gradient-to-r from-sky-600 to-sky-300")}
          style={{ width: `${utilization}%` }}
        />
      </div>

      {depot.specialties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {depot.specialties.map((s) => (
            <span key={s} className="chip capitalize">
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
