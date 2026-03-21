"use client"
import { Gauge, RadioTower, Wrench, CheckCircle } from "lucide-react"
import type { LivePulse } from "@kaz/shared"
import { formatTime } from "@/lib/format"

interface LiveFeedProps {
  pulses: LivePulse[]
}

function PulseIcon({ kind }: { kind: LivePulse["kind"] }) {
  switch (kind) {
    case "dispatch":
      return <RadioTower className="h-3.5 w-3.5 text-ai" />
    case "complete":
      return <CheckCircle className="h-3.5 w-3.5 text-healthy" />
    case "progress":
      return <Wrench className="h-3.5 w-3.5 text-info" />
    default:
      return <Gauge className="h-3.5 w-3.5 text-primary/60" />
  }
}

export function LiveFeed({ pulses }: LiveFeedProps) {
  return (
    <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-1">
      {pulses.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
      )}
      {pulses.map((pulse, idx) => (
        <div
          key={`${pulse.id}-${idx}`}
          className="flex items-start gap-3 rounded px-1 py-2 transition-colors hover:bg-glass-hover/30"
        >
          <span className="mt-0.5 shrink-0 text-muted-foreground">
            <PulseIcon kind={pulse.kind} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-foreground">{pulse.message}</p>
          </div>
          <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
            {formatTime(pulse.at)}
          </span>
        </div>
      ))}
    </div>
  )
}
