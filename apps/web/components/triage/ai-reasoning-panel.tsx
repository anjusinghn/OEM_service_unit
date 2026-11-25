import type { AiPriorityAssessment } from "@kaz/shared"
import { Sparkles, TriangleAlert } from "lucide-react"
import { cn } from "../../lib/cn"
import { AiBadge } from "../shared/ai-badge"

interface AiReasoningPanelProps {
  aiAssessment: AiPriorityAssessment | undefined | null
}

export function AiReasoningPanel({ aiAssessment }: AiReasoningPanelProps) {
  if (!aiAssessment) {
    return (
      <div className="glass-card flex items-center gap-3 rounded-2xl border-ai-border px-5 py-4">
        <Sparkles size={18} className="text-ai" />
        <p className="text-[15px] text-muted-foreground">AI assessment pending…</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ai-border bg-gradient-to-br from-ai/[0.08] via-white/[0.02] to-transparent">
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-ai-border bg-ai-muted text-ai">
              <Sparkles size={19} strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-base font-semibold text-foreground">AI priority assessment</p>
              <p className="text-sm text-faint">OpenRouter reasoning model</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiAssessment.shouldEscalate && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-critical/25 bg-critical-muted px-2.5 py-0.5 text-xs font-medium text-critical">
                <TriangleAlert size={13} /> Escalate
              </span>
            )}
            <AiBadge urgency={aiAssessment.urgency} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Adjusted score" value={String(aiAssessment.adjustedScore)} className="text-ai" />
          <Stat
            label="Adjustment"
            value={`${aiAssessment.adjustment > 0 ? "+" : ""}${aiAssessment.adjustment}`}
            className={
              aiAssessment.adjustment > 0 ? "text-critical" : aiAssessment.adjustment < 0 ? "text-healthy" : "text-muted-foreground"
            }
          />
          <Stat label="Confidence" value={`${Math.round(aiAssessment.confidence * 100)}%`} className="text-foreground" />
          {aiAssessment.latencyMs !== null && (
            <Stat label="Latency" value={`${aiAssessment.latencyMs}ms`} className="text-foreground" />
          )}
        </div>

        <p className="mt-5 text-base leading-relaxed text-foreground/90">{aiAssessment.recommendation}</p>

        {aiAssessment.riskFactors.length > 0 && (
          <div className="mt-5">
            <p className="label mb-2.5">Risk factors</p>
            <ul className="flex flex-col gap-2">
              {aiAssessment.riskFactors.map((factor) => (
                <li key={factor} className="flex items-start gap-3 text-[15px] text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ai" />
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl border border-border bg-ink-950/40 px-4 py-3">
      <p className="text-xs text-faint">{label}</p>
      <p className={cn("stat mt-1 text-2xl", className)}>{value}</p>
    </div>
  )
}
