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
