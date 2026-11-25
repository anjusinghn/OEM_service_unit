"use client"

import { useEffect } from "react"
import { BrainCircuit, Loader2, Repeat2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { PageHeader } from "@/components/shared/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { MetricCard } from "@/components/fleet/metric-card"
import { QualityTrendChart } from "@/components/intelligence/quality-trend-chart"
import { DecisionList } from "@/components/intelligence/decision-list"

const header = (
  <PageHeader
    eyebrow="Decision intelligence"
    title={
      <>
        Is the AI <span className="text-gradient">actually helping?</span>
      </>
    }
    description="Reward signals from completed repairs, compared against the heuristic baseline."
    actions={<span className="chip">Last 30 days</span>}
  />
)

export default function IntelligencePage() {
  const intelligence = useDashboardStore((s) => s.intelligence)

  useEffect(() => {
    if (!intelligence) {
      apiFetch<any>("/api/v1/intelligence")
        .then((data) => useDashboardStore.getState().setIntelligence(data))
        .catch(() => {})
    }
  }, [intelligence])

  if (!intelligence) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          <span className="text-base">Loading intelligence…</span>
        </div>
      </div>
    )
  }

  const bestScore = intelligence.bestDecisions[0]?.rewardScore ?? 0
  const worstScore = intelligence.worstDecisions[0]?.rewardScore ?? 0

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Override rate"
          value={`${Math.round(intelligence.overrideRate * 100)}%`}
          detail="Human overrides of AI decisions"
          icon={Repeat2}
        />
        <MetricCard
          label="Reward signals"
          value={intelligence.rewardSignals.length}
          detail="Outcome records collected"
          icon={Sparkles}
        />
        <MetricCard label="Best reward" value={bestScore.toFixed(2)} detail="Highest decision score" icon={ThumbsUp} />
        <MetricCard
          label="Worst reward"
          value={worstScore.toFixed(2)}
          detail="Lowest decision score"
          tone={worstScore < 0.5 ? "critical" : "default"}
          icon={ThumbsDown}
        />
      </div>

      <SectionCard title="Decision quality" description="AI + heuristic versus heuristic-only accuracy over time">
        {intelligence.qualityTrend.length > 0 ? (
          <QualityTrendChart data={intelligence.qualityTrend} />
        ) : (
          <div className="flex items-center justify-center py-14 text-muted-foreground">
            <BrainCircuit className="mr-3 h-5 w-5 text-faint" />
            <span className="text-base">Not enough outcomes for a trend yet.</span>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Best decisions" description="Highest reward scores">
          <DecisionList decisions={intelligence.bestDecisions} tone="healthy" />
        </SectionCard>
        <SectionCard title="Worst decisions" description="Lowest reward scores, worth a review">
          <DecisionList decisions={intelligence.worstDecisions} tone="critical" />
        </SectionCard>
      </div>

      {intelligence.weightAdjustmentProposals.length > 0 && (
        <SectionCard title="Weight proposals" description="Priority weight changes suggested by the AI">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {intelligence.weightAdjustmentProposals.map((proposal) => (
              <div key={`${proposal.decisionType}-${proposal.proposedWeight}`} className="glass-card rounded-xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-semibold capitalize text-foreground">{proposal.decisionType}</span>
                  <span className="font-mono text-[15px] text-muted-foreground">
                    {proposal.currentWeight} → <span className="text-sky-300">{proposal.proposedWeight}</span>
                  </span>
                </div>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{proposal.reason}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {intelligence.learnedPatterns.length > 0 && (
        <SectionCard title="Learned patterns" description="Patterns discovered from service outcomes">
          <div className="flex flex-col gap-3">
            {intelligence.learnedPatterns.map((pattern) => (
              <div key={pattern.pattern} className="glass-card flex items-start gap-4 rounded-xl p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ai-border bg-ai-muted text-ai">
                  <BrainCircuit size={19} strokeWidth={1.75} />
                </span>
                <div className="flex-1">
                  <p className="text-[15px] leading-relaxed text-foreground">{pattern.pattern}</p>
                  <p className="mt-1 font-mono text-sm text-faint">{(pattern.confidence * 100).toFixed(0)}% confidence</p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
