import type { ServiceTimelineEvent, ServiceRequestStatus } from "@kaz/shared"
import { cn } from "../../lib/cn"

const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  DETECTED: "Detected",
  PRIORITIZED: "Prioritized",
  DEPOT_ASSIGNED: "Depot assigned",
  TECHNICIAN_ASSIGNED: "Tech assigned",
  PARTS_CONFIRMED: "Parts confirmed",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CLOSED: "Closed",
}

const STATUS_DOT: Record<ServiceRequestStatus, string> = {
  DETECTED: "bg-critical",
  PRIORITIZED: "bg-watch",
  DEPOT_ASSIGNED: "bg-sky-500",
  TECHNICIAN_ASSIGNED: "bg-sky-400",
  PARTS_CONFIRMED: "bg-sky-400",
  SCHEDULED: "bg-ai",
  IN_PROGRESS: "bg-watch",
  COMPLETED: "bg-healthy",
  CLOSED: "bg-healthy",
}

export function Timeline({ timeline }: { timeline: ServiceTimelineEvent[] }) {
  if (timeline.length === 0) {
    return <p className="text-[15px] text-muted-foreground">No timeline events recorded.</p>
  }

  return (
    <ol>
      {timeline.map((event, idx) => (
        <li key={`${event.status}-${idx}`} className="relative flex gap-4 pb-6 last:pb-0">
          <div className="flex flex-col items-center">
            <div className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4 ring-ink-900", STATUS_DOT[event.status])} />
            {idx < timeline.length - 1 && <div className="mt-1.5 w-px flex-1 bg-border" />}
          </div>
          <div>
            <p className="text-base font-semibold leading-tight text-foreground">{STATUS_LABELS[event.status]}</p>
            {event.note && <p className="mt-1 text-[15px] text-muted-foreground">{event.note}</p>}
            <time className="mt-1 block font-mono text-sm text-faint">{new Date(event.at).toLocaleString()}</time>
          </div>
        </li>
      ))}
    </ol>
  )
}
