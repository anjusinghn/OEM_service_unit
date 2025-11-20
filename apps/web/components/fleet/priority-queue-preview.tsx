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
                "hover:bg-glass-hover/50 rounded"
              )}
