"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react"
import type { PriorityEntry } from "@kaz/shared"
import type { VehicleRecord } from "../../stores/dashboard-store"
import { cn } from "../../lib/cn"
import { StatusBadge } from "../shared/status-badge"
import { AiBadge } from "../shared/ai-badge"
import { PriorityRowExpanded } from "./priority-row-expanded"

interface PriorityTableProps {
  vehicles: VehicleRecord[]
  priorityQueue: PriorityEntry[]
}

type SortKey = "rank" | "health" | "score" | "status"
type SortDir = "asc" | "desc"

const STATUS_ORDER = { critical: 2, watch: 1, healthy: 0 } as const

export function PriorityTable({ vehicles, priorityQueue }: PriorityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("score")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const rows = priorityQueue
    .map((entry, rank) => {
      const vehicle = vehicles.find((v) => v.id === entry.vehicleId)
      if (!vehicle) return null
      return { entry, vehicle, rank }
    })
    .filter(
      (r): r is { entry: PriorityEntry; vehicle: VehicleRecord; rank: number } =>
        r !== null
    )

  const sorted = [...rows].sort((a, b) => {
    let va: number
    let vb: number

    if (sortKey === "rank") {
      va = a.rank
      vb = b.rank
    } else if (sortKey === "health") {
      va = a.vehicle.health.overall
      vb = b.vehicle.health.overall
    } else if (sortKey === "score") {
      va = a.entry.score
      vb = b.entry.score
    } else {
      va = STATUS_ORDER[a.entry.status] ?? 0
      vb = STATUS_ORDER[b.entry.status] ?? 0
    }

    return sortDir === "asc" ? va - vb : vb - va
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((c) => (c === id ? null : id))
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (sorted.length === 0) return

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIdx((i) => Math.min(i + 1, sorted.length - 1))
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        const row = sorted[selectedIdx]
        if (row) toggleExpand(row.vehicle.id)
      } else if (e.key === "Escape") {
        setExpandedId(null)
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [sorted, selectedIdx, toggleExpand])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ArrowUpDown size={12} className="text-muted-foreground/40" />
    if (sortDir === "asc") return <ArrowUp size={12} className="text-primary" />
    return <ArrowDown size={12} className="text-primary" />
  }

  return (
    <div className="overflow-x-auto glass-card rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-glass/50">
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleSort("rank")}
              >
                # <SortIcon col="rank" />
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Vehicle
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleSort("health")}
              >
                Health <SortIcon col="health" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleSort("score")}
              >
                Priority <SortIcon col="score" />
              </button>
            </th>
            <th className="px-4 py-3 text-left">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleSort("status")}
              >
                Status <SortIcon col="status" />
              </button>
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              AI Assessment
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, idx) => {
            const isExpanded = expandedId === row.vehicle.id
            const isSelected = selectedIdx === idx
            const ai = row.entry.breakdown.aiAssessment

            return (
              <Fragment key={row.vehicle.id}>
                <tr
                  className={cn(
                    "cursor-pointer select-none border-b border-border transition-colors",
                    isExpanded
                      ? "bg-glass/30"
                      : isSelected
                        ? "bg-primary/8 ring-1 ring-inset ring-primary/20"
                        : "hover:bg-glass-hover/30"
                  )}
                  onClick={() => {
                    setSelectedIdx(idx)
                    toggleExpand(row.vehicle.id)
                  }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {row.rank + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {row.vehicle.id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {row.vehicle.model} · {row.vehicle.region}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-sm font-bold tabular-nums",
