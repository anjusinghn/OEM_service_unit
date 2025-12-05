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
import { MinRoleGate } from "../shared/role-gate"

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
        <div className="glass-card rounded-xl p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Subsystem Health
