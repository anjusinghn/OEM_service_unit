import { cn } from "../../lib/cn"

interface AiBadgeProps {
  urgency: string
  size?: "sm" | "md"
}

export function AiBadge({ urgency, size = "sm" }: AiBadgeProps) {
  const urgencyStyle: Record<string, string> = {
    emergency: "bg-critical-muted text-critical border border-critical/20",
    urgent: "bg-watch-muted text-watch border border-watch/20",
    elevated: "bg-ai-muted text-ai border border-ai-border",
    routine: "bg-healthy-muted text-healthy border border-healthy/20",
  }

  const style = urgencyStyle[urgency] ?? "bg-ai-muted text-ai border border-ai-border"

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium capitalize",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        style
      )}
    >
      {urgency}
    </span>
  )
}
