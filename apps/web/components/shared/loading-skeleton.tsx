import { cn } from "@/lib/cn"

export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-panel animate-pulse rounded-2xl p-6", className)}>
      <div className="mb-5 h-3.5 w-28 rounded bg-white/8" />
      <div className="mb-4 h-11 w-20 rounded-lg bg-white/8" />
      <div className="h-3.5 w-36 rounded bg-white/8" />
    </div>
  )
}

export function TableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {Array.from({ length: rows }, (_, i) => i).map((i) => (
        <div key={`skeleton-row-${i}`} className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-white/8" />
          <div className="h-4 flex-1 rounded bg-white/8" />
          <div className="h-4 w-16 rounded bg-white/8" />
          <div className="h-4 w-10 rounded bg-white/8" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="mx-auto h-[200px] w-[200px] rounded-full bg-white/8" />
      <div className="mt-6 flex justify-center gap-4">
        <div className="h-4 w-24 rounded bg-white/8" />
        <div className="h-4 w-24 rounded bg-white/8" />
        <div className="h-4 w-24 rounded bg-white/8" />
      </div>
    </div>
  )
}
