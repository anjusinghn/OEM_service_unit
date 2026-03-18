"use client"

import type { AiDispatchPlan } from "@kaz/shared"
import { motion } from "framer-motion"
import { AlertTriangle, Car, Cpu, Minus, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import { apiFetch } from "../../lib/api-client"
import { cn } from "../../lib/cn"
import { useDashboardStore } from "../../stores/dashboard-store"
import type { TraceStep } from "./agent-trace"
import { AgentTrace } from "./agent-trace"
import { DispatchActions } from "./dispatch-actions"
import { DispatchPlanCard } from "./dispatch-plan-card"

const DEFAULT_STEPS = [
  "Fetching vehicle data",
  "Checking service history",
  "Evaluating depot options",
  "Checking parts availability",
  "Searching similar cases",
  "Generating dispatch plan",
]

const STEP_INTERVAL_MS = 180
const STEP_DURATION_MS = 400

interface Props {
  vehicleId: string
}

export function DispatchAgent({ vehicleId }: Props) {
  const vehicles = useDashboardStore((s) => s.vehicles)
  const vehicle = vehicles.find((v) => v.id === vehicleId)

  const [plan, setPlan] = useState<AiDispatchPlan | null>(null)
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const runDispatch = async () => {
    setPlan(null)
    setTraceSteps([])
    setIsRunning(true)
    setError(null)
    setDone(false)

    try {
      const result = await apiFetch<AiDispatchPlan>(
        `/api/v1/orchestration/vehicles/${vehicleId}/dispatch-plan`
      )

      const steps =
        result.agentTrace.length > 0 ? result.agentTrace : DEFAULT_STEPS
      const stepDuration =
        result.latencyMs !== null
          ? result.latencyMs / steps.length
          : STEP_DURATION_MS

      for (let i = 0; i < steps.length; i++) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, STEP_INTERVAL_MS)
        )
        setTraceSteps((prev) => [
          ...prev,
          { description: steps[i], done: false },
        ])
        await new Promise<void>((resolve) => setTimeout(resolve, stepDuration))
        setTraceSteps((prev) =>
          prev.map((s, idx) =>
            idx === i
              ? {
                  ...s,
                  done: true,
                  durationMs: Math.round(
                    stepDuration * (0.85 + Math.random() * 0.3)
                  ),
                }
              : s
          )
        )
      }

      setPlan(result)
      setDone(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dispatch plan"
      )
    } finally {
      setIsRunning(false)
    }
  }

  const handleReset = () => {
    setPlan(null)
    setTraceSteps([])
    setDone(false)
    setError(null)
  }

  const healthColors: Record<string, string> = {
    healthy: "text-healthy",
    watch: "text-watch",
    critical: "text-critical",
  }

  return (
    <div className="space-y-5">
      {vehicle ? (
        <div className="rounded-lg border border-border bg-card px-5 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-secondary">
                <Car size={17} className="text-muted-foreground" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">
                  {vehicle.vin}
                </div>
                <div className="text-xs text-muted-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model} &middot;{" "}
                  {vehicle.routeName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Health</div>
                <div
                  className={cn(
                    "font-semibold tabular-nums",
                    healthColors[vehicle.health.status]
                  )}
                >
                  {vehicle.health.overall}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Status</div>
                <div
                  className={cn(
                    "font-semibold capitalize",
                    healthColors[vehicle.health.status]
                  )}
                >
                  {vehicle.health.status}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">Trend</div>
                <div className="font-medium text-foreground flex items-center gap-1 capitalize">
                  {vehicle.health.trend === "improving" ? (
                    <TrendingUp size={12} className="text-healthy" />
                  ) : vehicle.health.trend === "degrading" ? (
                    <TrendingDown size={12} className="text-critical" />
                  ) : (
                    <Minus size={12} className="text-muted-foreground" />
                  )}
                  {vehicle.health.trend}
                </div>
              </div>
            </div>
          </div>

          {vehicle.faults.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle size={12} className="text-watch" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Active Faults
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {vehicle.faults.slice(0, 5).map((f) => (
                  <span
                    key={f.id}
                    className={cn(
                      "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
                      f.severity === "critical" || f.severity === "safety"
                        ? "bg-critical-muted text-critical"
                        : "bg-watch-muted text-watch"
                    )}
                  >
                    {f.dtcCode}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
          Vehicle data not yet loaded. Ensure the dashboard SSE connection is
          active.
        </div>
      )}

      {!isRunning && !done && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <button
            type="button"
            onClick={runDispatch}
            className={cn(
              "flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold",
              "bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            )}
          >
            <Cpu size={15} />
            Run AI Dispatch
          </button>
        </motion.div>
      )}

      {error && (
        <div className="rounded-lg border border-critical/30 bg-critical-muted px-4 py-3 text-sm text-critical">
          {error}
        </div>
      )}

      {(isRunning || traceSteps.length > 0) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AgentTrace steps={traceSteps} isRunning={isRunning} />
        </motion.div>
      )}

      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DispatchPlanCard plan={plan} />
        </motion.div>
      )}

      {plan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="pt-1"
        >
          <DispatchActions vehicleId={vehicleId} onCancel={handleReset} />
        </motion.div>
      )}
    </div>
  )
}
