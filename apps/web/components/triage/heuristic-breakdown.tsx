import type { PriorityBreakdown } from "@kaz/shared"
import { cn } from "../../lib/cn"

interface HeuristicBreakdownProps {
  breakdown: PriorityBreakdown
  aiAdjustedScore?: number
}

const HEURISTIC_ITEMS: { key: keyof PriorityBreakdown; label: string }[] = [
  { key: "safetyUrgency", label: "Safety urgency" },
  { key: "failureProximity", label: "Failure proximity" },
  { key: "businessImpact", label: "Business impact" },
  { key: "downtimeCost", label: "Downtime cost" },
  { key: "serviceWindow", label: "Service window" },
]

function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-critical"
  return "bg-gradient-to-r from-sky-600 to-sky-400"
}

export function HeuristicBreakdown({ breakdown, aiAdjustedScore }: HeuristicBreakdownProps) {
  const scores = HEURISTIC_ITEMS.map(({ key }) => breakdown[key] as number)
  const composite = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label">Priority factors</p>
        <div className="flex items-center gap-2">
          <span className="chip">
            Heuristic <span className="font-mono text-foreground">{composite}</span>
          </span>
          {aiAdjustedScore !== undefined && (
            <span className="chip border-ai-border bg-ai-muted text-ai">
              AI <span className="font-mono">{aiAdjustedScore}</span>
            </span>
          )}
        </div>
      </div>

      {HEURISTIC_ITEMS.map(({ key, label }) => {
        const score = breakdown[key] as number
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-muted-foreground">{label}</span>
              <span className="font-mono text-[15px] font-medium text-foreground">{score}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn("h-full rounded-full transition-all", scoreBarColor(score))}
                style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
