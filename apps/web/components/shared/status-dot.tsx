import { cn } from "@/lib/cn"

export function StatusDot({ status, className }: { status: "healthy" | "watch" | "critical"; className?: string }) {
  return (
    <span className={cn(
      "inline-block h-2 w-2 rounded-full",
      status === "healthy" && "bg-healthy",
      status === "watch" && "bg-watch",
      status === "critical" && "bg-critical",
      className
    )} />
  )
}
