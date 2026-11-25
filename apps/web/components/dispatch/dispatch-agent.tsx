"use client"

import type { AiDispatchPlan } from "@kaz/shared"
import { motion } from "framer-motion"
import { Cpu, Minus, TrendingDown, TrendingUp, TriangleAlert, Truck } from "lucide-react"
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
    <div className="flex flex-col gap-6">
      {vehicle ? (
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-accent text-sky-400">
                <Truck size={22} strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-mono text-lg font-medium text-foreground">{vehicle.vin}</p>
                <p className="mt-0.5 text-[15px] text-muted-foreground">
                  {vehicle.year} {vehicle.make} {vehicle.model} · {vehicle.routeName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border bg-ink-950/40 px-4 py-3">
                <p className="text-xs text-faint">Health</p>
                <p className={cn("stat mt-1 text-2xl", vehicle.health.status === "critical" ? "text-critical" : "text-foreground")}>{vehicle.health.overall}</p>
              </div>
              <div className="rounded-xl border border-border bg-ink-950/40 px-4 py-3">
                <p className="text-xs text-faint">Status</p>
                <p className={cn("mt-1.5 text-base font-semibold capitalize", healthColors[vehicle.health.status])}>
                  {vehicle.health.status}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-ink-950/40 px-4 py-3">
                <p className="text-xs text-faint">Trend</p>
                <p className="mt-1.5 flex items-center gap-1.5 text-base font-medium capitalize text-foreground">
                  {vehicle.health.trend === "improving" ? (
                    <TrendingUp size={16} className="text-healthy" />
                  ) : vehicle.health.trend === "degrading" ? (
                    <TrendingDown size={16} className="text-critical" />
                  ) : (
                    <Minus size={16} className="text-faint" />
                  )}
                  {vehicle.health.trend}
                </p>
              </div>
            </div>
          </div>

          {vehicle.faults.length > 0 && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="label mb-3 flex items-center gap-2">
                <TriangleAlert size={15} className="text-watch" />
                Active faults
              </p>
              <div className="flex flex-wrap gap-2">
                {vehicle.faults.slice(0, 6).map((f) => (
                  <span
                    key={f.id}
                    className={cn(
                      "inline-flex items-center rounded-lg border px-2.5 py-1 font-mono text-sm",
                      f.severity === "critical" || f.severity === "safety"
                        ? "border-critical/25 bg-critical-muted text-critical"
                        : "border-watch/25 bg-watch-muted text-watch"
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
        <div className="glass-panel rounded-2xl px-6 py-5 text-[15px] text-muted-foreground">
          Vehicle data is still loading from the live stream.
        </div>
      )}

      {!isRunning && !done && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" onClick={runDispatch} className="btn btn-sky btn-lg">
            <Cpu size={18} />
            {vehicle?.buildBatch === "CHENNAI-SIM" ? "Compare workshops" : "Run AI dispatch"}
          </button>
        </motion.div>
      )}

      {error && (
        <div className="rounded-2xl border border-critical/30 bg-critical-muted px-5 py-4 text-[15px] text-critical">{error}</div>
      )}

      {(isRunning || traceSteps.length > 0) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <AgentTrace steps={traceSteps} isRunning={isRunning} />
        </motion.div>
      )}

      {plan && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <DispatchPlanCard plan={plan} />
        </motion.div>
      )}

      {plan && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <DispatchActions
            vehicleId={vehicleId}
            recommendedDepotId={plan.candidates ? plan.depotId : undefined}
            eligibleDepotIds={plan.candidates?.map((candidate) => candidate.depotId)}
            onCancel={handleReset}
          />
        </motion.div>
      )}
    </div>
  )
}
