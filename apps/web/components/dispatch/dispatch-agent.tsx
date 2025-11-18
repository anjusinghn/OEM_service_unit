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
