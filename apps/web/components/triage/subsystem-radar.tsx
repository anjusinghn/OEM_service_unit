"use client"

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts"
import type { SubsystemKey } from "@kaz/shared"

interface SubsystemRadarProps {
  subsystems: Record<SubsystemKey, number>
  status: "healthy" | "watch" | "critical"
}

const SUBSYSTEM_LABELS: Record<SubsystemKey, string> = {
  engine: "Engine",
  cooling: "Cooling",
  brakes: "Brakes",
  electrical: "Electrical",
  exhaust: "Exhaust",
  turbo: "Turbo",
  fuel: "Fuel",
  transmission: "Trans.",
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "#7fc4e2",
  watch: "#7fc4e2",
  critical: "#f4978e",
}

export function SubsystemRadar({ subsystems, status }: SubsystemRadarProps) {
  const data = (Object.entries(subsystems) as [SubsystemKey, number][]).map(([key, value]) => ({
    subject: SUBSYSTEM_LABELS[key],
    score: value,
    fullMark: 100,
  }))

  const color = STATUS_COLORS[status] ?? STATUS_COLORS.healthy

  return (
    <ResponsiveContainer width="100%" height={290} minWidth={260}>
      <RadarChart data={data} margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
        <PolarGrid stroke="rgb(202 229 241 / 0.14)" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 14, fill: "#a9bcc7" }} />
        <Radar name="Health" dataKey="score" stroke={color} fill={color} fillOpacity={0.22} strokeWidth={2} />
        <Tooltip
          contentStyle={{
            background: "#0d2231",
            border: "1px solid rgb(202 229 241 / 0.2)",
            borderRadius: 12,
            fontSize: 14,
            color: "#f0f5f7",
          }}
          itemStyle={{ color: "#f0f5f7" }}
          formatter={(value) => [String(value), "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
