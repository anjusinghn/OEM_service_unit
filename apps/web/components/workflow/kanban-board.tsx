"use client"

import { useDashboardStore } from "@/stores/dashboard-store"
import { KanbanCard } from "./kanban-card"
import { cn } from "@/lib/cn"
import type { ServiceRequestStatus } from "@kaz/shared"

const COLUMNS: ServiceRequestStatus[] = [
  "DETECTED",
  "PRIORITIZED",
  "DEPOT_ASSIGNED",
  "PARTS_CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
]

const COLUMN_LABELS: Record<ServiceRequestStatus, string> = {
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

export function KanbanBoard() {
  const serviceRequests = useDashboardStore((s) => s.serviceRequests)
  const vehicles = useDashboardStore((s) => s.vehicles)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
