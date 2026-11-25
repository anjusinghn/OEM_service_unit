"use client"
import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react"
import type { AiEscalation } from "@kaz/shared"
import { cn } from "@/lib/cn"

interface AiEscalationCardProps {
  escalations: AiEscalation[]
}

export function AiEscalationCard({ escalations }: AiEscalationCardProps) {
  if (escalations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-ai-border bg-ai-muted text-ai">
          <ShieldCheck size={22} strokeWidth={1.75} />
        </span>
        <p className="text-sm text-muted-foreground">No AI escalations right now.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {escalations.map((escalation, idx) => {
        const critical = escalation.severity === "critical"
        return (
          <div key={`${escalation.type}-${idx}`} className="glass-card flex items-start gap-4 rounded-xl p-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                critical ? "border-critical/25 bg-critical-muted text-critical" : "border-watch/25 bg-watch-muted text-watch"
              )}
            >
              {critical ? <ShieldAlert size={19} strokeWidth={1.75} /> : <TriangleAlert size={19} strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">{escalation.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{escalation.description}</p>
              {escalation.affectedEntities.length > 0 && (
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-faint">
                  {escalation.affectedEntities.length} affected{" "}
                  {escalation.affectedEntities.length === 1 ? "entity" : "entities"}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
