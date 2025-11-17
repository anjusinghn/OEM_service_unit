"use client"

import * as Select from "@radix-ui/react-select"
import { ChevronDown, Sparkles } from "lucide-react"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "../../../lib/cn"
import { useDashboardStore } from "../../../stores/dashboard-store"
import { DispatchAgent } from "../../../components/dispatch/dispatch-agent"

function DispatchPageContent() {
  const searchParams = useSearchParams()
  const vehicles = useDashboardStore((s) => s.vehicles)
  const priorityQueue = useDashboardStore((s) => s.priorityQueue)

  const paramVehicleId = searchParams.get("vehicleId")

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const scoreA =
      priorityQueue.find((p) => p.vehicleId === a.id)?.score ?? 0
    const scoreB =
      priorityQueue.find((p) => p.vehicleId === b.id)?.score ?? 0
    return scoreB - scoreA
  })

  const defaultId =
    paramVehicleId ??
    sortedVehicles[0]?.id ??
    ""

  const [selectedId, setSelectedId] = useState<string>(defaultId)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg glass-card mt-0.5">
          <Sparkles size={16} className="text-ai" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground"><span className="text-ai">AI</span> Dispatch Agent</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Multi-step AI reasoning for depot selection and service staging
          </p>
        </div>
      </div>

      <div className="glass-card rounded-xl px-5 py-4">
        <label
          htmlFor="vehicle-select"
          className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2"
        >
          Select Vehicle
        </label>
        {vehicles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Loading vehicles&hellip;
          </p>
        ) : (
          <Select.Root value={selectedId} onValueChange={setSelectedId}>
            <Select.Trigger
              id="vehicle-select"
              className={cn(
                "flex w-full max-w-sm items-center justify-between rounded-md border border-input",
                "bg-background px-3 py-2 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring"
              )}
