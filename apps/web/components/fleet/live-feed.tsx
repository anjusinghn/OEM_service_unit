"use client"
import { CircleCheck, Gauge, RadioTower, Wrench } from "lucide-react"
import type { LivePulse } from "@kaz/shared"
import { formatTime } from "@/lib/format"
import { cn } from "@/lib/cn"

interface LiveFeedProps {
  pulses: LivePulse[]
}

const KIND_STYLE: Record<string, { icon: typeof Gauge; tone: string }> = {
  dispatch: { icon: RadioTower, tone: "border-ai-border bg-ai-muted text-ai" },
  complete: { icon: CircleCheck, tone: "border-healthy/25 bg-healthy-muted text-healthy" },
  progress: { icon: Wrench, tone: "border-sky-500/25 bg-info-muted text-info" },
}

export function LiveFeed({ pulses }: LiveFeedProps) {
  if (pulses.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Waiting for the first telemetry event…</p>
  }

  return (
    <div className="-mr-2 flex max-h-[420px] flex-col overflow-y-auto pr-2">
      {pulses.map((pulse, idx) => {
        const style = KIND_STYLE[pulse.kind] ?? { icon: Gauge, tone: "border-border bg-white/5 text-sky-300" }
        const Icon = style.icon
        return (
          <div
            key={`${pulse.id}-${idx}`}
            className="flex items-center gap-4 border-b border-border py-3 last:border-0"
          >
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", style.tone)}>
              <Icon size={17} strokeWidth={1.75} />
            </span>
            <p className="min-w-0 flex-1 truncate text-[15px] text-foreground">{pulse.message}</p>
            <span className="shrink-0 font-mono text-sm tabular-nums text-faint">{formatTime(pulse.at)}</span>
          </div>
        )
      })}
    </div>
  )
}
