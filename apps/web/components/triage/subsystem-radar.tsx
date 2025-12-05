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
