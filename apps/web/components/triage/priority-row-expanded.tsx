"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Route } from "lucide-react"
import { toast } from "sonner"
import type { VehicleRecord } from "../../stores/dashboard-store"
import { apiPost, errorMessage } from "../../lib/api-client"
import { SubsystemRadar } from "./subsystem-radar"
import { HeuristicBreakdown } from "./heuristic-breakdown"
import { AiReasoningPanel } from "./ai-reasoning-panel"
import { MinRoleGate } from "../shared/role-gate"

interface PriorityRowExpandedProps {
  vehicle: VehicleRecord
}

export function PriorityRowExpanded({ vehicle }: PriorityRowExpandedProps) {
  const router = useRouter()
  const [dispatching, setDispatching] = useState(false)
  const breakdown = vehicle.priority?.breakdown
  const aiAssessment = breakdown?.aiAssessment

  const handleQuickDispatch = async () => {
    setDispatching(true)
    try {
      await apiPost(`/api/v1/orchestration/vehicles/${vehicle.id}/dispatch`)
      toast.success("Vehicle dispatched", { description: `${vehicle.id} has been dispatched to service.` })
      router.push("/workflow")
    } catch (err) {
      toast.error("Dispatch not sent", { description: errorMessage(err, "Unable to dispatch vehicle.") })
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <p className="label mb-2">Subsystem health</p>
          <SubsystemRadar subsystems={vehicle.health.subsystems} status={vehicle.health.status} />
        </div>

        {breakdown ? (
          <div className="glass-card rounded-2xl p-5">
            <HeuristicBreakdown breakdown={breakdown} aiAdjustedScore={aiAssessment?.adjustedScore} />
          </div>
        ) : (
          <div className="glass-card flex items-center justify-center rounded-2xl p-5">
            <p className="text-sm text-muted-foreground">No priority breakdown available.</p>
          </div>
        )}
      </div>

      <AiReasoningPanel aiAssessment={aiAssessment ?? undefined} />

      <MinRoleGate minRole="DEPOT_MANAGER">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => router.push(`/dispatch?vehicleId=${vehicle.id}`)} className="btn btn-sky">
            <Route size={16} />
            Plan AI dispatch
          </button>
          <button type="button" onClick={handleQuickDispatch} disabled={dispatching} className="btn btn-ghost">
            {dispatching ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Quick dispatch
          </button>
        </div>
      </MinRoleGate>
    </div>
  )
}
