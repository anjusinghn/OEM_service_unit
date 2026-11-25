"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { DecisionQualityPoint } from "@kaz/shared"

const axisTick = { fontSize: 14, fill: "#a9bcc7" }

export function QualityTrendChart({ data }: { data: DecisionQualityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="rgb(202 229 241 / 0.1)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} stroke="rgb(202 229 241 / 0.14)" tickLine={false} />
        <YAxis
          domain={[0, 1]}
          tick={axisTick}
          stroke="rgb(202 229 241 / 0.14)"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
        />
        <Tooltip
          contentStyle={{
            background: "#0d2231",
            border: "1px solid rgb(202 229 241 / 0.2)",
            borderRadius: 12,
            fontSize: 14,
            color: "#f0f5f7",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 14, color: "#a9bcc7", paddingTop: 12 }} />
        <Line type="monotone" dataKey="heuristicScore" name="Heuristic" stroke="#608b9d" strokeWidth={2.5} dot={false} />
        <Line type="monotone" dataKey="aiScore" name="AI + heuristic" stroke="#7fc4e2" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
