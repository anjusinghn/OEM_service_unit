"use client"
import { ShieldAlert, AlertTriangle, Shield } from "lucide-react"
import type { AiEscalation } from "@kaz/shared"
import { cn } from "@/lib/cn"

interface AiEscalationCardProps {
  escalations: AiEscalation[]
}

export function AiEscalationCard({ escalations }: AiEscalationCardProps) {
  if (escalations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <Shield className="h-8 w-8 text-ai/40" />
        <p className="text-sm text-muted-foreground">No AI escalations currently active.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {escalations.map((escalation, idx) => (
        <div
          key={`${escalation.type}-${idx}`}
          className={cn(
            "glass-card rounded-xl p-4",
            "!border-l-2",
            escalation.severity === "critical"
              ? "!border-l-critical"
              : escalation.severity === "warning"
                ? "!border-l-watch"
                : "!border-l-ai"
          )}
        >
          <div className="flex items-start gap-3">
            <span className={cn(
              "mt-0.5 shrink-0",
              escalation.severity === "critical" ? "text-critical" : "text-watch"
            )}>
              {escalation.severity === "critical"
                ? <ShieldAlert className="h-4 w-4" />
                : <AlertTriangle className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{escalation.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{escalation.description}</p>
              {escalation.affectedEntities.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {escalation.affectedEntities.length} affected{" "}
                  {escalation.affectedEntities.length === 1 ? "entity" : "entities"}
                </p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 text-xs font-medium text-primary hover:underline"
            >
              Investigate →
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
