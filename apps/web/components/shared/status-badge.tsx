import { cn } from "../../lib/cn"

interface StatusBadgeProps {
  status: "healthy" | "watch" | "critical"
  size?: "sm" | "md"
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const base = cn(
    "inline-flex items-center gap-1.5 rounded-full font-medium",
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
  )

  const variant = {
    healthy: "bg-healthy-muted text-healthy",
    watch: "bg-watch-muted text-watch",
    critical: "bg-critical-muted text-critical",
  }[status]

  const dotColor = {
    healthy: "bg-healthy",
    watch: "bg-watch",
    critical: "bg-critical",
  }[status]

  return (
    <span className={cn(base, variant)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      {status}
    </span>
  )
}
