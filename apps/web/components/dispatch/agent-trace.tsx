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
    <div className="rounded-lg border border-ai-border bg-card overflow-hidden">
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
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-start gap-3"
            >
              <div className="mt-0.5 flex-shrink-0">
                {step.done ? (
                  <CheckCircle2 size={14} className="text-healthy" />
                ) : (
                  <Loader2 size={14} className="text-ai animate-spin" />
                )}
              </div>
              <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
                <span
                  className={cn(
                    "text-sm leading-snug",
                    step.done ? "text-foreground" : "text-ai"
                  )}
                >
                  <span className="text-[11px] font-mono text-muted-foreground mr-2">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {step.description}
                </span>
                {step.done && step.durationMs !== undefined && (
                  <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
                    {(step.durationMs / 1000).toFixed(2)}s
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {steps.length === 0 && (
          <div className="flex items-center gap-2.5 py-1">
            <Loader2 size={14} className="text-ai animate-spin flex-shrink-0" />
            <span className="text-sm text-muted-foreground">
              Starting dispatch analysis...
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
