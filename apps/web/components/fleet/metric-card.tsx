"use client"
import type { LucideIcon } from "lucide-react"
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
  icon?: LucideIcon
  trend?: TrendProps
}

const toneIcon: Record<string, string> = {
  default: "bg-accent text-sky-400 border-sky-500/25",
  healthy: "bg-healthy-muted text-healthy border-healthy/25",
  watch: "bg-watch-muted text-watch border-watch/25",
  critical: "bg-critical-muted text-critical border-critical/25",
}

export function MetricCard({ label, value, detail, tone = "default", icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="glass-panel group rounded-2xl p-6 transition-[transform,border-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:border-border-strong">
      <div className="flex items-center justify-between gap-3">
        <p className="label">{label}</p>
        {Icon && (
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", toneIcon[tone])}>
            <Icon size={20} strokeWidth={1.75} />
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end gap-2.5">
        <span className="stat text-[44px] leading-none text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              "mb-1 text-sm font-medium",
              trend.direction === "up" && "text-healthy",
              trend.direction === "down" && "text-critical",
              trend.direction === "flat" && "text-muted-foreground"
            )}
          >
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"} {trend.value}
          </span>
        )}
      </div>
      {detail && <p className="mt-3 text-sm text-muted-foreground">{detail}</p>}
    </div>
  )
}
