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

const toneDot: Record<string, string> = {
  default: "bg-primary/50",
  healthy: "bg-healthy",
  watch: "bg-watch",
  critical: "bg-critical",
}

export function MetricCard({ label, value, detail, tone = "default", trend }: MetricCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-xl p-5 transition-all duration-200 hover:bg-glass-hover"
    )}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full", toneDot[tone])} />
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
