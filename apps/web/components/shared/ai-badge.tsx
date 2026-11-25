import { cn } from "../../lib/cn"

interface AiBadgeProps {
  urgency: string
  size?: "sm" | "md"
}

const urgencyDot: Record<string, string> = {
  emergency: "bg-critical",
  urgent: "bg-critical",
  elevated: "bg-watch",
  routine: "bg-healthy",
}

export function AiBadge({ urgency, size = "sm" }: AiBadgeProps) {
  const hot = urgency === "emergency" || urgency === "urgent"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium capitalize",
        size === "sm" ? "px-3 py-1 text-xs" : "px-3.5 py-1 text-sm",
        hot ? "border-critical/30 bg-critical-muted text-frost" : "border-border bg-white/[0.04] text-muted-foreground"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", urgencyDot[urgency] ?? "bg-ai")} />
      {urgency}
    </span>
  )
}
