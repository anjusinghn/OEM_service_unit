import type { AiDispatchPlan } from "@kaz/shared"
import { AlertTriangle, CheckCircle2, Clock, Copy, MapPin, Wrench } from "lucide-react"
import { cn } from "../../lib/cn"

interface Props {
  plan: AiDispatchPlan
}

const urgencyStyles: Record<AiDispatchPlan["urgencyLevel"], string> = {
  routine: "text-healthy bg-healthy-muted",
  elevated: "text-watch bg-watch-muted",
  urgent: "text-critical bg-critical-muted",
  emergency: "text-critical bg-critical-muted",
}

function SectionHeader({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      {icon}
      <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export function DispatchPlanCard({ plan }: Props) {
  const confidencePct = Math.round(plan.confidence * 100)

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            Dispatch Plan
          </span>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-xs font-semibold",
              urgencyStyles[plan.urgencyLevel]
            )}
          >
            {plan.urgencyLevel}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className={cn(
              "font-medium",
              confidencePct >= 80
                ? "text-healthy"
                : confidencePct >= 60
                ? "text-watch"
                : "text-critical"
            )}
          >
            {confidencePct}% confidence
          </span>
          {plan.latencyMs !== null && (
            <span>{(plan.latencyMs / 1000).toFixed(1)}s</span>
          )}
          {plan.model && (
            <span className="hidden sm:inline text-muted-foreground/60">
              {plan.model}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        <div className="px-5 py-4">
          <SectionHeader
            icon={<MapPin size={13} className="text-ai" />}
            label="Depot"
          />
          <div className="font-semibold text-sm text-foreground mb-1">
            {plan.depotId}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.depotReasoning}
          </p>
        </div>

        {plan.partsToStage.length > 0 && (
