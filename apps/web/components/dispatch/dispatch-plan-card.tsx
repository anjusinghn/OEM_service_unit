import type { AiDispatchPlan } from "@kaz/shared"
import { AlertTriangle, CheckCircle2, Clock, Copy, MapPin, User, Wrench } from "lucide-react"
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
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

        <div className="px-5 py-4">
          <SectionHeader
            icon={<User size={13} className="text-ai" />}
            label="Technician"
          />
          <div className="font-semibold text-sm text-foreground mb-1">
            {plan.technicianId}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {plan.techReasoning}
          </p>
        </div>

        {plan.partsToStage.length > 0 && (
          <div className="px-5 py-4">
            <SectionHeader
              icon={<Wrench size={13} className="text-ai" />}
              label="Parts to Stage"
            />
            <ul className="space-y-1.5">
              {plan.partsToStage.map((part) => (
                <li
                  key={part}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 size={13} className="text-healthy flex-shrink-0" />
                  {part}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-5 py-4">
          <SectionHeader
            icon={<Clock size={13} className="text-ai" />}
            label="Estimated"
          />
          <div className="flex gap-8">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">
                Repair hours
              </div>
              <div className="font-semibold text-sm text-foreground">
                {plan.estimatedRepairHours}h
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">
                Total cost
              </div>
              <div className="font-semibold text-sm text-foreground">
                ${plan.estimatedTotalCost.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {plan.watchPoints.length > 0 && (
          <div className="px-5 py-4">
            <SectionHeader
              icon={<AlertTriangle size={13} className="text-watch" />}
              label="Watch Points"
            />
            <ul className="space-y-2">
              {plan.watchPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="text-watch mt-0.5 flex-shrink-0">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {plan.alternativePlan && (
          <div className="px-5 py-4 bg-secondary/20">
            <SectionHeader
              icon={<Copy size={13} className="text-muted-foreground" />}
              label="Alternative Plan"
            />
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">
                  Depot
                </div>
                <div className="font-medium text-sm text-foreground">
                  {plan.alternativePlan.depotId}
                </div>
              </div>
              {plan.alternativePlan.technicianId && (
                <div>
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Technician
                  </div>
                  <div className="font-medium text-sm text-foreground">
                    {plan.alternativePlan.technicianId}
                  </div>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {plan.alternativePlan.reasoning}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
