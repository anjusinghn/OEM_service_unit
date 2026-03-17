"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2, Zap } from "lucide-react"
import { toast } from "sonner"
import type { VehicleRecord } from "../../stores/dashboard-store"
import { apiPost } from "../../lib/api-client"
import { SubsystemRadar } from "./subsystem-radar"
import { HeuristicBreakdown } from "./heuristic-breakdown"
import { AiReasoningPanel } from "./ai-reasoning-panel"

interface PriorityRowExpandedProps {
  vehicle: VehicleRecord
}

export function PriorityRowExpanded({ vehicle }: PriorityRowExpandedProps) {
  const router = useRouter()
  const [dispatching, setDispatching] = useState(false)
  const breakdown = vehicle.priority?.breakdown
  const aiAssessment = breakdown?.aiAssessment

  const handleAiDispatch = () => {
    router.push(`/dispatch?vehicleId=${vehicle.id}`)
  }

  const handleQuickDispatch = async () => {
    setDispatching(true)
    try {
      await apiPost(`/api/v1/orchestration/vehicles/${vehicle.id}/dispatch`)
      toast.success("Vehicle dispatched", {
        description: `${vehicle.id} has been dispatched to service.`,
      })
      router.push("/workflow")
    } catch {
      toast.error("Dispatch failed", {
        description: "Unable to dispatch vehicle. Please try again.",
      })
    } finally {
      setDispatching(false)
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subsystem Health
          </h4>
          <SubsystemRadar
            subsystems={vehicle.health.subsystems}
            status={vehicle.health.status}
          />
        </div>

        {breakdown ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <HeuristicBreakdown
              breakdown={breakdown}
              aiAdjustedScore={aiAssessment?.adjustedScore}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">No priority breakdown available</p>
          </div>
        )}
      </div>

      <div className="mb-4">
        <AiReasoningPanel aiAssessment={aiAssessment ?? undefined} />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleAiDispatch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Zap size={14} />
          AI Dispatch
        </button>
        <button
          type="button"
          onClick={handleQuickDispatch}
          disabled={dispatching}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {dispatching ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          Quick Dispatch
        </button>
      </div>
    </div>
  )
}
