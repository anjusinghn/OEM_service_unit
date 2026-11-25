import { cn } from "../../lib/cn"

interface StatusBadgeProps {
  status: "healthy" | "watch" | "critical"
  size?: "sm" | "md"
}

const dotColor = {
  healthy: "bg-healthy",
  watch: "bg-watch",
  critical: "bg-critical shadow-[0_0_0_3px_rgb(244_151_142/0.18)]",
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium capitalize",
        size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1 text-sm",
        status === "critical"
          ? "border-critical/30 bg-critical-muted text-frost"
          : "border-border bg-white/[0.04] text-muted-foreground"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[status])} />
      {status}
    </span>
  )
}
