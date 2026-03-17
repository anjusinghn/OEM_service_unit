"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { DecisionQualityPoint } from "@kaz/shared"

export function QualityTrendChart({ data }: { data: DecisionQualityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          stroke="var(--color-muted-foreground)"
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fontSize: 11 }}
          stroke="var(--color-muted-foreground)"
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Line
          type="monotone"
          dataKey="heuristicScore"
          name="Heuristic"
          stroke="var(--color-info)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="aiScore"
          name="AI + Heuristic"
          stroke="var(--color-ai)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
