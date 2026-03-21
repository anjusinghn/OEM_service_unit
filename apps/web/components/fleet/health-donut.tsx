"use client"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { StatusDot } from "@/components/shared/status-dot"

interface HealthDonutProps {
  healthy: number
  watch: number
  critical: number
}

export function HealthDonut({ healthy, watch, critical }: HealthDonutProps) {
  const total = healthy + watch + critical

  const data = [
    { name: "Healthy", value: healthy, fill: "var(--color-healthy)" },
    { name: "Watch", value: watch, fill: "var(--color-watch)" },
    { name: "Critical", value: critical, fill: "var(--color-critical)" },
  ]

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              isAnimationActive
              animationBegin={0}
              animationDuration={600}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">{total}</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">vehicles</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <LegendItem status="healthy" count={healthy} label="Healthy" />
        <LegendItem status="watch" count={watch} label="Watch" />
        <LegendItem status="critical" count={critical} label="Critical" />
      </div>
    </div>
  )
}

function LegendItem({ status, count, label }: { status: "healthy" | "watch" | "critical"; count: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <StatusDot status={status} />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{count}</span>
    </div>
  )
}
