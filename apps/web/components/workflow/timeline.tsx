import type { ServiceTimelineEvent, ServiceRequestStatus } from "@kaz/shared"
import { cn } from "../../lib/cn"

const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  DETECTED: "Detected",
  PRIORITIZED: "Prioritized",
  DEPOT_ASSIGNED: "Depot Assigned",
  TECHNICIAN_ASSIGNED: "Tech Assigned",
  PARTS_CONFIRMED: "Parts Confirmed",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CLOSED: "Closed",
}

const STATUS_DOT: Record<ServiceRequestStatus, string> = {
  DETECTED: "bg-critical",
  PRIORITIZED: "bg-watch",
  DEPOT_ASSIGNED: "bg-info",
  TECHNICIAN_ASSIGNED: "bg-info",
  PARTS_CONFIRMED: "bg-info",
  SCHEDULED: "bg-watch",
  IN_PROGRESS: "bg-watch",
  COMPLETED: "bg-healthy",
  CLOSED: "bg-healthy",
}

interface TimelineProps {
  timeline: ServiceTimelineEvent[]
}

export function Timeline({ timeline }: TimelineProps) {
  if (timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No timeline events recorded.</p>
    )
  }

  return (
    <ol>
      {timeline.map((event, idx) => (
        <li key={`${event.status}-${idx}`} className="relative flex gap-3 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "mt-[3px] h-2.5 w-2.5 flex-shrink-0 rounded-full ring-2 ring-card",
                STATUS_DOT[event.status]
              )}
            />
            {idx < timeline.length - 1 && (
              <div className="mt-1 w-px flex-1 bg-border" />
            )}
          </div>
          <div className="pb-1">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {STATUS_LABELS[event.status]}
            </p>
            {event.note && (
              <p className="mt-0.5 text-xs text-muted-foreground">{event.note}</p>
            )}
            <time className="mt-0.5 block text-[11px] text-muted-foreground/60">
              {new Date(event.at).toLocaleString()}
            </time>
          </div>
        </li>
      ))}
    </ol>
  )
}
