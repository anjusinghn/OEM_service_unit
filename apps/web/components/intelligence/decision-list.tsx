import type { DecisionReviewItem } from "@kaz/shared"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/format"

interface DecisionListProps {
  decisions: DecisionReviewItem[]
  tone?: "healthy" | "critical"
}

export function DecisionList({ decisions, tone = "healthy" }: DecisionListProps) {
  if (decisions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No decisions recorded yet.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {decisions.slice(0, 5).map((item) => (
        <div key={item.decisionLogId} className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {item.decisionType} · {item.vehicleId}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatRelativeTime(item.createdAt)}
            </p>
          </div>
          <span className={cn(
            "font-mono text-sm font-bold",
            tone === "healthy" ? "text-healthy" : "text-critical",
          )}>
            {item.rewardScore.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}
