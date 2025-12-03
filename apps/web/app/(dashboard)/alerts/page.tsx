"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { SectionCard } from "@/components/shared/section-card"
import { AiEscalationCard } from "@/components/fleet/ai-escalation-card"
import { cn } from "@/lib/cn"
import { formatRelativeTime } from "@/lib/format"
import { AlertTriangle, ShieldAlert, Bell } from "lucide-react"

export default function AlertsPage() {
  const alerts = useDashboardStore((s) => s.alerts)
  const aiEscalations = useDashboardStore((s) => s.aiEscalations)
  const overview = useDashboardStore((s) => s.overview)

  useEffect(() => {
    if (!overview) {
      apiFetch<any>("/api/v1/dashboard")
        .then((data) => useDashboardStore.getState().setSnapshot(data))
        .catch(() => {})
    }
  }, [overview])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><span className="text-watch">Alerts</span> & Escalations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {alerts.length} active alerts · {aiEscalations.length} AI escalations
        </p>
      </div>

      {aiEscalations.length > 0 && (
        <SectionCard title="AI Escalations" description="Issues flagged by the AI reasoning engine">
          <AiEscalationCard escalations={aiEscalations} />
        </SectionCard>
      )}

      <SectionCard title="Active Alerts" description="Real-time fault and degradation alerts from fleet telemetry">
        {alerts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {alerts.map((alert) => {
              const isCritical = alert.severity === "critical" || alert.severity === "safety"
