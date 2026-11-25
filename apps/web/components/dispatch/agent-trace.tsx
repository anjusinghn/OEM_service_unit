"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CircleCheck, Loader2 } from "lucide-react"
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
  const totalSeconds = steps.reduce((acc, s) => acc + (s.durationMs ?? 0), 0) / 1000

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <span className={cn("h-2.5 w-2.5 rounded-full", isRunning ? "animate-pulse bg-ai" : "bg-healthy")} />
          <h2 className="text-xl font-semibold text-foreground">{isRunning ? "Agent is working…" : "Agent trace"}</h2>
        </div>
        {!isRunning && steps.length > 0 && (
          <span className="font-mono text-sm text-faint">
            {steps.length} steps · {totalSeconds.toFixed(1)}s
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-6 py-4">
        <AnimatePresence initial={false}>
          {steps.map((step, idx) => (
            <motion.div
              key={step.description}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-4 py-2"
            >
              <span className="w-7 font-mono text-sm text-faint">{String(idx + 1).padStart(2, "0")}</span>
              {step.done ? (
                <CircleCheck size={18} className="shrink-0 text-healthy" />
              ) : (
                <Loader2 size={18} className="shrink-0 animate-spin text-ai" />
              )}
              <span className={cn("flex-1 text-[15px]", step.done ? "text-foreground" : "text-ai")}>{step.description}</span>
              {step.done && step.durationMs !== undefined && (
                <span className="font-mono text-sm tabular-nums text-faint">{(step.durationMs / 1000).toFixed(2)}s</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {steps.length === 0 && (
          <div className="flex items-center gap-3 py-2">
            <Loader2 size={18} className="shrink-0 animate-spin text-ai" />
            <span className="text-[15px] text-muted-foreground">Starting dispatch analysis…</span>
          </div>
        )}
      </div>
    </div>
  )
}
