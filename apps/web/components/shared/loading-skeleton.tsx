import { cn } from "@/lib/cn"

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg border border-border bg-card p-5", className)}>
      <div className="mb-3 h-3 w-24 rounded bg-muted" />
      <div className="mb-2 h-9 w-16 rounded bg-muted" />
      <div className="h-3 w-32 rounded bg-muted" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: rows }, (_, i) => i).map((i) => (
        <div key={`skeleton-row-${i}`} className="flex items-center gap-3">
          <div className="h-6 w-6 rounded-full bg-muted" />
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-4 w-16 rounded bg-muted" />
          <div className="h-4 w-12 rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="mx-auto h-[160px] w-[160px] rounded-full bg-muted" />
      <div className="mt-4 flex justify-center gap-4">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    </div>
  )
}
