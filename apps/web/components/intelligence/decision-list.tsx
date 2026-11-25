import type { DecisionReviewItem } from "@kaz/shared"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/format"

interface DecisionListProps {
  decisions: DecisionReviewItem[]
  tone?: "healthy" | "critical"
}

export function DecisionList({ decisions, tone = "healthy" }: DecisionListProps) {
  if (decisions.length === 0) {
    return <p className="py-8 text-center text-[15px] text-muted-foreground">No decisions recorded yet.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {decisions.slice(0, 5).map((item) => (
        <div key={item.decisionLogId} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium capitalize text-foreground">
              {item.decisionType} <span className="font-mono normal-case text-muted-foreground">· {item.vehicleId}</span>
            </p>
            <p className="mt-0.5 text-sm text-faint">{formatRelativeTime(item.createdAt)}</p>
          </div>
          <span className={cn("stat text-2xl", tone === "healthy" ? "text-sky-300" : "text-critical")}>
            {item.rewardScore.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}
