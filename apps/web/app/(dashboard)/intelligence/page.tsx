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
          <h1 className="text-2xl font-bold tracking-tight"><span className="text-ai">Decision</span> Intelligence</h1>
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
          <h1 className="text-2xl font-bold tracking-tight"><span className="text-ai">Decision</span> Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            AI performance, reward signals, and decision quality tracking
          </p>
        </div>
        <span className="glass-card rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground">
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
