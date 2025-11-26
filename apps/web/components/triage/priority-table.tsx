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
