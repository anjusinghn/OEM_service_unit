"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { SectionCard } from "@/components/shared/section-card"
import { MetricCard } from "@/components/fleet/metric-card"
import { QualityTrendChart } from "@/components/intelligence/quality-trend-chart"
import { DecisionList } from "@/components/intelligence/decision-list"
import { Brain, Loader2 } from "lucide-react"

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
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Decision Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI vs heuristic performance tracking</p>
        </div>
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="text-sm">Loading intelligence data...</span>
        </div>
      </div>
    )
  }

  const bestScore = intelligence.bestDecisions[0]?.rewardScore ?? 0
  const worstScore = intelligence.worstDecisions[0]?.rewardScore ?? 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Decision Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI performance, reward signals, and decision quality tracking
          </p>
        </div>
        <span className="rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Last 30 days
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Override rate"
          value={`${Math.round(intelligence.overrideRate * 100)}%`}
          detail="Human overrides of AI decisions"
        />
        <MetricCard
          label="Reward signals"
          value={intelligence.rewardSignals.length}
          detail="Total outcome records"
        />
        <MetricCard
          label="Best reward"
          value={bestScore.toFixed(2)}
          detail="Highest decision score"
          tone="healthy"
        />
        <MetricCard
          label="Worst reward"
          value={worstScore.toFixed(2)}
          detail="Lowest decision score"
          tone={worstScore < 0.5 ? "critical" : "watch"}
        />
      </div>

      <SectionCard title="Decision Quality Trend" description="AI+Heuristic vs Heuristic-only accuracy over time">
        {intelligence.qualityTrend.length > 0 ? (
          <QualityTrendChart data={intelligence.qualityTrend} />
        ) : (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Brain className="mr-2 h-5 w-5 opacity-40" />
            <span className="text-sm">Not enough data for trend analysis yet.</span>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <SectionCard title="Best Decisions" description="Highest reward scores">
          <DecisionList decisions={intelligence.bestDecisions} tone="healthy" />
        </SectionCard>
        <SectionCard title="Worst Decisions" description="Lowest reward scores — review for improvement">
          <DecisionList decisions={intelligence.worstDecisions} tone="critical" />
        </SectionCard>
      </div>

      {intelligence.weightAdjustmentProposals.length > 0 && (
        <SectionCard title="Weight Adjustment Proposals" description="AI-suggested priority weight changes">
          <div className="flex flex-col gap-3">
            {intelligence.weightAdjustmentProposals.map((proposal) => (
              <div key={`${proposal.decisionType}-${proposal.proposedWeight}`} className="rounded-md border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize text-foreground">{proposal.decisionType}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {proposal.currentWeight} → {proposal.proposedWeight}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{proposal.reason}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {intelligence.learnedPatterns.length > 0 && (
        <SectionCard title="Learned Patterns" description="Patterns discovered from service outcomes">
          <div className="flex flex-col gap-2">
            {intelligence.learnedPatterns.map((pattern) => (
              <div key={pattern.pattern} className="flex items-start gap-3 rounded-md border border-border p-3">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-ai" />
                <div>
                  <p className="text-sm text-foreground">{pattern.pattern}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    confidence: {(pattern.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
