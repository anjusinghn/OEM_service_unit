"use client"

import { useEffect } from "react"
import { Warehouse } from "lucide-react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { PageHeader } from "@/components/shared/page-header"
import { DepotCard } from "@/components/depot/depot-card"

export default function DepotsPage() {
  const depots = useDashboardStore((s) => s.depots)
  const overview = useDashboardStore((s) => s.overview)

  useEffect(() => {
    if (!overview) {
      apiFetch<any>("/api/v1/dashboard")
        .then((data) => useDashboardStore.getState().setSnapshot(data))
        .catch(() => {})
    }
  }, [overview])

  const totalBays = depots.reduce((sum, d) => sum + d.totalBays, 0)
  const occupiedBays = depots.reduce((sum, d) => sum + d.occupiedBays, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Depot network"
        title={
          <>
            Capacity across <span className="text-gradient">every service bay.</span>
          </>
        }
        description="Live bay occupancy and specialties for each service center, used by dispatch to route vehicles."
        actions={
          depots.length > 0 && (
            <span className="chip">
              {depots.length} depots · {totalBays - occupiedBays} of {totalBays} bays open
            </span>
          )
        }
      />

      {depots.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {depots.map((depot) => (
            <DepotCard key={depot.id} depot={depot} />
          ))}
        </div>
      ) : (
        <div className="glass-panel flex flex-col items-center justify-center rounded-2xl py-20 text-muted-foreground">
          <Warehouse className="mb-4 h-10 w-10 text-faint" strokeWidth={1.5} />
          <p className="text-base">Depot data is loading…</p>
        </div>
      )}
    </div>
  )
}
