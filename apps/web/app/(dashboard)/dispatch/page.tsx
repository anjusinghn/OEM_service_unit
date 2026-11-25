"use client"

import * as Select from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"
import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "../../../lib/cn"
import { useDashboardStore } from "../../../stores/dashboard-store"
import { DispatchAgent } from "../../../components/dispatch/dispatch-agent"
import { PageHeader } from "../../../components/shared/page-header"

function DispatchPageContent() {
  const searchParams = useSearchParams()
  const vehicles = useDashboardStore((s) => s.vehicles)
  const priorityQueue = useDashboardStore((s) => s.priorityQueue)

  const scoreOf = (id: string) => priorityQueue.find((p) => p.vehicleId === id)?.score ?? 0
  const sortedVehicles = [...vehicles].sort((a, b) => scoreOf(b.id) - scoreOf(a.id))
  const defaultId = searchParams.get("vehicleId") ?? sortedVehicles[0]?.id ?? ""
  const [selectedId, setSelectedId] = useState<string>(defaultId)
  const activeId = selectedId || defaultId

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="AI dispatch"
        title={
          <>
            From fault code to <span className="text-gradient">a staged repair.</span>
          </>
        }
        description="The agent pulls vehicle history, weighs depots, checks parts, and drafts a dispatch plan step by step."
      />

      <div className="glass-panel flex flex-col gap-4 rounded-2xl p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <label htmlFor="vehicle-select" className="label">
            Vehicle
          </label>
          <p className="mt-1 text-sm text-muted-foreground">Sorted by priority score, highest first.</p>
        </div>
        {vehicles.length === 0 ? (
          <p className="text-[15px] text-muted-foreground">Loading vehicles…</p>
        ) : (
          <Select.Root value={activeId} onValueChange={setSelectedId}>
            <Select.Trigger
              id="vehicle-select"
              className="glass-input flex h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left font-mono text-[15px] md:w-[420px]"
            >
              <Select.Value placeholder="Select a vehicle…" />
              <Select.Icon>
                <ChevronDown size={18} className="text-faint" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={8}
                className="glass-popover z-50 max-h-[420px] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl"
              >
                <Select.Viewport className="p-1.5">
                  {sortedVehicles.map((v) => {
                    const priority = priorityQueue.find((p) => p.vehicleId === v.id)
                    return (
                      <Select.Item
                        key={v.id}
                        value={v.id}
                        className={cn(
                          "relative flex cursor-pointer select-none items-center justify-between gap-4 rounded-lg px-3 py-2.5 outline-none",
                          "data-[highlighted]:bg-accent data-[state=checked]:bg-accent"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[15px] text-foreground">
                            <Select.ItemText>{v.vin}</Select.ItemText>
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {v.year} {v.make} {v.model} · {v.region}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {priority && <span className="font-mono text-sm text-faint">{priority.score}</span>}
                          <Select.ItemIndicator>
                            <Check size={16} className="text-sky-400" />
                          </Select.ItemIndicator>
                        </div>
                      </Select.Item>
                    )
                  })}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        )}
      </div>

      {activeId && <DispatchAgent key={activeId} vehicleId={activeId} />}
    </div>
  )
}

export default function DispatchPage() {
  return (
    <Suspense fallback={<p className="py-12 text-[15px] text-muted-foreground">Loading dispatch…</p>}>
      <DispatchPageContent />
    </Suspense>
  )
}
