"use client"

import { SectionCard } from "@/components/shared/section-card"
import { Settings as SettingsIcon, Lock, Shield, Users, Sliders } from "lucide-react"

const PRIORITY_WEIGHTS = [
  { factor: "Safety urgency", weight: 30, color: "bg-critical" },
  { factor: "Failure proximity", weight: 25, color: "bg-watch" },
  { factor: "Business impact", weight: 20, color: "bg-info" },
  { factor: "Downtime cost", weight: 15, color: "bg-ai" },
  { factor: "Service window", weight: 10, color: "bg-muted-foreground" },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><span className="text-primary">Settings</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organization configuration, priority weights, and system settings.
        </p>
      </div>

      <SectionCard title="Organization" description="Platform identity and environment">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Organization
            </span>
            <p className="mt-1 text-sm font-medium text-foreground">kazindustries</p>
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Environment
            </span>
            <p className="mt-1 text-sm font-medium text-foreground">Production</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Priority Weights"
        description="Factors used to rank vehicle service urgency"
        action={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sliders className="h-3.5 w-3.5" /> Read-only
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          {PRIORITY_WEIGHTS.map((item) => (
            <div key={item.factor}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm text-foreground">{item.factor}</span>
                <span className="font-mono text-xs font-semibold text-muted-foreground">{item.weight}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-glass">
                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.weight}%` }} />
              </div>
            </div>
          ))}
