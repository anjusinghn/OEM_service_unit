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
