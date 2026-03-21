"use client"

import { useState } from "react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { apiPatch, apiFetch } from "@/lib/api-client"
import { useDashboardStore } from "@/stores/dashboard-store"
import { cn } from "@/lib/cn"
import { ArrowRight, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { CompletionForm } from "./completion-form"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

interface KanbanCardProps {
  request: ServiceRequest
  vehicle?: VehicleRecord
}

export function KanbanCard({ request, vehicle }: KanbanCardProps) {
  const [busy, setBusy] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const reload = async () => {
    try {
      const data = await apiFetch<DashboardPayload>("/api/v1/dashboard")
      useDashboardStore.getState().setSnapshot(data)
    } catch {
    }
  }

  const advance = async () => {
    setBusy(true)
    try {
      await apiPatch(`/api/v1/service-requests/${request.id}/status`, {})
      toast.success(`Advanced ${request.id}`)
      await reload()
    } catch {
      toast.error("Failed to advance")
    } finally {
      setBusy(false)
    }
  }

  const isTerminal = request.status === "COMPLETED" || request.status === "CLOSED"

  return (
    <>
      <div className="glass-card rounded-xl p-3 transition-colors hover:bg-glass-hover">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-semibold text-foreground">{request.id}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {vehicle?.vin ?? request.vehicleId} · {request.weakestSubsystem}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {request.priorityScore}
          </span>
        </div>

        {(request.depotId ?? request.technicianId) ? (
          <div className="mt-2 flex gap-3 text-[10px] text-muted-foreground">
            {request.depotId && <span>📍 {request.depotId}</span>}
            {request.technicianId && <span>👤 {request.technicianId}</span>}
          </div>
        ) : null}

        {request.timeline.length > 0 && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            {request.timeline[request.timeline.length - 1]?.note}
          </p>
        )}

        {!isTerminal && (
          <div className="mt-3 flex gap-2">
            {request.status !== "IN_PROGRESS" && (
              <button
                type="button"
                onClick={advance}
                disabled={busy}
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-foreground bg-secondary hover:bg-secondary/80 transition-colors",
                  busy && "opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowRight className="h-3 w-3" /> Advance
              </button>
            )}
            {request.status === "IN_PROGRESS" && (
              <button
                type="button"
                onClick={() => setShowCompletion(true)}
                className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
              >
                <CheckCircle className="h-3 w-3" /> Complete
              </button>
            )}
          </div>
        )}
      </div>

      {showCompletion && (
        <CompletionForm
          requestId={request.id}
          onClose={() => setShowCompletion(false)}
          onComplete={reload}
        />
      )}
    </>
  )
}
