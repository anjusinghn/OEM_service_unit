"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Minus, TrendingDown, TrendingUp } from "lucide-react"
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
    if (sortKey !== col) return <ArrowUpDown size={14} className="text-faint/60" />
    if (sortDir === "asc") return <ArrowUp size={14} className="text-sky-400" />
    return <ArrowDown size={14} className="text-sky-400" />
  }

  const th = "px-4 py-4 text-left font-mono text-xs font-medium uppercase tracking-[0.12em] text-faint"
  const sortBtn = "flex items-center gap-1.5 uppercase tracking-[0.12em] transition-colors hover:text-foreground"

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-[15px]">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              <th className={th}>
                <button type="button" className={sortBtn} onClick={() => handleSort("rank")}>
                  Rank <SortIcon col="rank" />
                </button>
              </th>
              <th className={th}>Vehicle</th>
              <th className={th}>
                <button type="button" className={sortBtn} onClick={() => handleSort("health")}>
                  Health <SortIcon col="health" />
                </button>
              </th>
              <th className={th}>
                <button type="button" className={sortBtn} onClick={() => handleSort("score")}>
                  Priority <SortIcon col="score" />
                </button>
              </th>
              <th className={th}>
                <button type="button" className={sortBtn} onClick={() => handleSort("status")}>
                  Status <SortIcon col="status" />
                </button>
              </th>
              <th className={th}>AI assessment</th>
              <th className={cn(th, "text-right")}>
                <span className="sr-only">Expand</span>
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
                        ? "bg-accent/60"
                        : isSelected
                          ? "bg-white/[0.045] shadow-[inset_3px_0_0_0_var(--color-sky-500)]"
                          : "hover:bg-glass-hover"
                    )}
                    onClick={() => {
                      setSelectedIdx(idx)
                      toggleExpand(row.vehicle.id)
                    }}
                  >
                    <td className="px-4 py-4 font-mono text-sm text-faint">{String(row.rank + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-4">
                      <p className="font-mono text-[15px] font-medium text-foreground">{row.vehicle.id}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {row.vehicle.model} · {row.vehicle.region}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "stat text-xl",
                            row.vehicle.health.status === "critical" ? "text-critical" : "text-foreground"
                          )}
                        >
                          {row.vehicle.health.overall}
                        </span>
                        {row.vehicle.health.trend === "improving" ? (
                          <TrendingUp size={16} className="text-healthy" />
                        ) : row.vehicle.health.trend === "degrading" ? (
                          <TrendingDown size={16} className="text-critical" />
                        ) : (
                          <Minus size={16} className="text-faint" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="stat text-xl text-foreground">{row.entry.score}</span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.entry.status} />
                    </td>
                    <td className="px-4 py-4">
                      {ai ? (
                        <div className="flex items-center gap-3">
                          <AiBadge urgency={ai.urgency} />
                          <span className="max-w-[260px] truncate text-sm text-muted-foreground">{ai.recommendation}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-faint">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-90 border-sky-500/30 text-sky-400"
                        )}
                      >
                        <ChevronRight size={17} />
                      </span>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="border-b border-border bg-ink-950/30 p-0">
                        <PriorityRowExpanded vehicle={row.vehicle} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="flex items-center justify-center py-20 text-center">
          <span className="text-base text-muted-foreground">No vehicles match these filters.</span>
        </div>
      )}
    </div>
  )
}
