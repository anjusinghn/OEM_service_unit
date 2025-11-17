"use client"

import { useState } from "react"
import type { DashboardSnapshot, Depot, ForensicsSnapshot, ServiceRequest } from "@kaz/shared"
import type { VehicleRecord } from "@/stores/dashboard-store"
import { apiPatch, apiFetch } from "@/lib/api-client"
import { useDashboardStore } from "@/stores/dashboard-store"
import { cn } from "@/lib/cn"
import { ArrowRight, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { CompletionForm } from "./completion-form"

type DashboardPayload = DashboardSnapshot & {
  vehicles: VehicleRecord[]
  depots: Depot[]
  serviceRequests: ServiceRequest[]
  forensics?: ForensicsSnapshot
  generatedAt: string
}

interface KanbanCardProps {
  request: ServiceRequest
  vehicle?: VehicleRecord
}

export function KanbanCard({ request, vehicle }: KanbanCardProps) {
  const [busy, setBusy] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  const reload = async () => {
    try {
      const data = await apiFetch<DashboardPayload>("/api/v1/dashboard")
      useDashboardStore.getState().setSnapshot(data)
    } catch {
    }
  }

  const advance = async () => {
    setBusy(true)
    try {
      await apiPatch(`/api/v1/service-requests/${request.id}/status`, {})
      toast.success(`Advanced ${request.id}`)
      await reload()
    } catch {
      toast.error("Failed to advance")
    } finally {
      setBusy(false)
    }
  }

  const isTerminal = request.status === "COMPLETED" || request.status === "CLOSED"

  return (
    <>
      <div className="glass-card rounded-xl p-3 transition-colors hover:bg-glass-hover">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-xs font-semibold text-foreground">{request.id}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
