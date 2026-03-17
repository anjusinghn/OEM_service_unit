"use client"
import { cn } from "@/lib/cn"

interface TrendProps {
  direction: "up" | "down" | "flat"
  value: string
}

interface MetricCardProps {
  label: string
  value: string | number
  detail?: string
  tone?: "default" | "healthy" | "watch" | "critical"
  trend?: TrendProps
}

const toneTopBorder: Record<string, string> = {
  default: "border-t-border",
  healthy: "border-t-healthy",
  watch: "border-t-watch",
  critical: "border-t-critical",
}

export function MetricCard({ label, value, detail, tone = "default", trend }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md",
      "border-t-2",
      toneTopBorder[tone]
    )}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        {trend && (
          <span className={cn(
            "mb-1 text-sm font-medium",
            trend.direction === "up" && "text-healthy",
            trend.direction === "down" && "text-critical",
            trend.direction === "flat" && "text-muted-foreground"
          )}>
            {trend.direction === "up" && "▲"}
            {trend.direction === "down" && "▼"}
            {trend.direction === "flat" && "—"}
            {" "}{trend.value}
          </span>
        )}
      </div>
      {detail && (
        <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
      )}
    </div>
  )
}
