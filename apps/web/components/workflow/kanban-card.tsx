"use client"

import { useState } from "react"
import { ArrowRight, CircleCheck, HardHat, Warehouse } from "lucide-react"
import { toast } from "sonner"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch, apiPatch, errorMessage } from "@/lib/api-client"
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
    } catch {}
  }

  const advance = async () => {
    setBusy(true)
    try {
      await apiPatch(`/api/v1/service-requests/${request.id}/status`, {})
      toast.success(`Advanced ${request.id}`)
      await reload()
    } catch (err) {
      toast.error("Could not advance", { description: errorMessage(err, "Please try again.") })
    } finally {
      setBusy(false)
    }
  }

  const isTerminal = request.status === "CLOSED" || (request.status === "COMPLETED" && vehicle?.buildBatch !== "CHENNAI-SIM")
  const lastNote = request.timeline[request.timeline.length - 1]?.note

  return (
    <>
      <div className="glass-card rounded-xl p-4 transition-colors hover:border-border-strong">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-mono text-[15px] font-medium text-foreground">{request.id}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {vehicle?.vin ?? request.vehicleId} · <span className="capitalize">{request.weakestSubsystem}</span>
            </p>
          </div>
          <span className="stat shrink-0 rounded-lg border border-sky-500/25 bg-accent px-2 py-0.5 text-base text-sky-300">
            {request.priorityScore}
          </span>
        </div>

        {(request.depotId ?? request.technicianId) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {request.depotId && (
              <span className="flex items-center gap-1.5">
                <Warehouse size={15} className="text-faint" /> {request.depotId}
              </span>
            )}
            {request.technicianId && (
              <span className="flex items-center gap-1.5">
                <HardHat size={15} className="text-faint" /> {request.technicianId}
              </span>
            )}
          </div>
        )}

        {lastNote && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-faint">{lastNote}</p>}

        {!isTerminal && (
          <div className="mt-4">
            {request.status === "IN_PROGRESS" ? (
              <button type="button" onClick={() => setShowCompletion(true)} className="btn btn-sky btn-sm">
                <CircleCheck size={14} /> Complete
              </button>
            ) : (
              <button type="button" onClick={advance} disabled={busy} className="btn btn-ghost btn-sm">
                <ArrowRight size={14} /> {request.status === "COMPLETED" ? "Close" : "Advance"}
              </button>
            )}
          </div>
        )}
      </div>

      {showCompletion && (
        <CompletionForm requestId={request.id} onClose={() => setShowCompletion(false)} onComplete={reload} />
      )}
    </>
  )
}
