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
  if (score >= 50) return "bg-watch"
  return "bg-healthy"
}

export function HeuristicBreakdown({
  breakdown,
  aiAdjustedScore,
}: HeuristicBreakdownProps) {
  const numericScores = [
    breakdown.safetyUrgency,
    breakdown.failureProximity,
    breakdown.businessImpact,
    breakdown.downtimeCost,
    breakdown.serviceWindow,
  ]
  const composite = Math.round(
    numericScores.reduce((a, b) => a + b, 0) / numericScores.length
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Priority Factors
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Heuristic:{" "}
            <span className="font-semibold text-foreground">{composite}</span>
          </span>
          {aiAdjustedScore !== undefined && (
            <span className="text-xs text-ai">
              AI: <span className="font-semibold">{aiAdjustedScore}</span>
            </span>
          )}
        </div>
      </div>

      {HEURISTIC_ITEMS.map(({ key, label }) => {
        const score = breakdown[key] as number
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium text-foreground">{score}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
