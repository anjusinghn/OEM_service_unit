"use client"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/cn"

interface HealthDonutProps {
  healthy: number
  watch: number
  critical: number
}

const SEGMENTS = [
  { key: "healthy", label: "Healthy", fill: "var(--color-healthy)", dot: "bg-healthy" },
  { key: "watch", label: "Watch", fill: "var(--color-watch)", dot: "bg-watch" },
  { key: "critical", label: "Critical", fill: "var(--color-critical)", dot: "bg-critical" },
] as const

export function HealthDonut({ healthy, watch, critical }: HealthDonutProps) {
  const counts = { healthy, watch, critical }
  const total = healthy + watch + critical
  const data = SEGMENTS.map((s) => ({ name: s.label, value: counts[s.key], fill: s.fill }))

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative h-[240px] w-full">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={78}
              outerRadius={108}
              paddingAngle={2.5}
              cornerRadius={6}
              dataKey="value"
              isAnimationActive
              animationDuration={600}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="stat text-[44px] leading-none text-foreground">{total}</span>
          <span className="label mt-2">Vehicles</span>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {SEGMENTS.map((s) => {
          const count = counts[s.key]
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={s.key} className="glass-card rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="stat mt-1.5 text-2xl text-foreground">
                {count}
                <span className="ml-1.5 font-sans text-sm font-normal tracking-normal text-faint">{pct}%</span>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
