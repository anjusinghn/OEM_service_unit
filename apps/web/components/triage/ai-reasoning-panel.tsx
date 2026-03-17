import type { AiPriorityAssessment } from "@kaz/shared"
import { cn } from "../../lib/cn"
import { AiBadge } from "../shared/ai-badge"

interface AiReasoningPanelProps {
  aiAssessment: AiPriorityAssessment | undefined | null
}

export function AiReasoningPanel({ aiAssessment }: AiReasoningPanelProps) {
  if (!aiAssessment) {
    return (
      <div className="rounded-lg border border-ai-border bg-ai-muted px-4 py-3">
        <p className="text-sm italic text-muted-foreground">AI assessment pending…</p>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-ai-border bg-ai-muted">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-ai/[0.04] to-transparent" />

      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <span className="text-sm font-semibold text-foreground">AI Priority Assessment</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-ai-border bg-ai-muted px-2 py-0.5 text-xs font-medium text-ai">
              OpenRouter AI
            </span>
            <AiBadge urgency={aiAssessment.urgency} />
          </div>
        </div>

        <div className="mb-3 flex items-center gap-6 border-b border-ai-border pb-3">
          <div>
            <p className="text-xs text-muted-foreground">Adjusted score</p>
            <p className="text-lg font-bold text-ai">{aiAssessment.adjustedScore}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Adjustment</p>
            <p
              className={cn(
                "text-lg font-bold",
                aiAssessment.adjustment > 0
                  ? "text-critical"
                  : aiAssessment.adjustment < 0
                    ? "text-healthy"
                    : "text-muted-foreground"
              )}
            >
              {aiAssessment.adjustment > 0 ? "+" : ""}
              {aiAssessment.adjustment}
            </p>
          </div>
          {aiAssessment.shouldEscalate && (
            <span className="ml-auto rounded-full border border-critical/20 bg-critical-muted px-2 py-0.5 text-xs font-medium text-critical">
              ⚠ Escalate
            </span>
          )}
        </div>

        {aiAssessment.riskFactors.length > 0 && (
          <div className="mb-3">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Risk Factors
            </p>
            <ul className="space-y-1">
              {aiAssessment.riskFactors.map((factor) => (
                <li key={factor} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 text-ai">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mb-3 text-sm text-foreground/80">{aiAssessment.recommendation}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Confidence:{" "}
            <span className="font-semibold text-ai">
              {Math.round(aiAssessment.confidence * 100)}%
            </span>
          </span>
          {aiAssessment.latencyMs !== null && (
            <span>Latency: {aiAssessment.latencyMs}ms</span>
          )}
        </div>
      </div>
    </div>
  )
}
