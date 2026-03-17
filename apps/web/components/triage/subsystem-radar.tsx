"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
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
  healthy: "hsl(160 60% 45%)",
  watch: "hsl(38 92% 50%)",
  critical: "hsl(346 77% 50%)",
}

export function SubsystemRadar({ subsystems, status }: SubsystemRadarProps) {
  const data = (Object.entries(subsystems) as [SubsystemKey, number][]).map(
    ([key, value]) => ({
      subject: SUBSYSTEM_LABELS[key],
      score: value,
      fullMark: 100,
    })
  )

  const fillColor = STATUS_COLORS[status] ?? STATUS_COLORS.healthy

  return (
    <ResponsiveContainer width="100%" height={250} minWidth={250}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="hsl(220 13% 91% / 0.4)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 11, fill: "hsl(215 20% 65%)" }}
        />
        <Radar
          name="Health"
          dataKey="score"
          stroke={fillColor}
          fill={fillColor}
          fillOpacity={0.2}
          strokeWidth={1.5}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(224 50% 8%)",
            border: "1px solid hsl(223 47% 16%)",
            borderRadius: 8,
            fontSize: 12,
            color: "hsl(213 31% 91%)",
          }}
          formatter={(value) => [String(value), "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
