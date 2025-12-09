"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "../../lib/cn"

export interface TraceStep {
  description: string
  done: boolean
  durationMs?: number
}

interface Props {
  steps: TraceStep[]
  isRunning: boolean
}

export function AgentTrace({ steps, isRunning }: Props) {
  const totalSeconds =
    steps.reduce((acc, s) => acc + (s.durationMs ?? 0), 0) / 1000

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ai-border bg-ai-muted">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              isRunning ? "bg-ai animate-pulse" : "bg-healthy"
            )}
          />
          <span className="text-sm font-semibold text-foreground">
            {isRunning ? "Agent running..." : "Agent trace complete"}
          </span>
        </div>
        {!isRunning && steps.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {steps.length} steps &middot; {totalSeconds.toFixed(1)}s
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-2.5">
        <AnimatePresence initial={false}>
          {steps.map((step, idx) => (
            <motion.div
              key={step.description}
