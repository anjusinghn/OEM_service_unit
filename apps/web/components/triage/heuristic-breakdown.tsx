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
