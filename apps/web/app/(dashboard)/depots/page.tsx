"use client"

import { useEffect } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import { apiFetch } from "@/lib/api-client"
import { DepotCard } from "@/components/depot/depot-card"
import { Building2 } from "lucide-react"

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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Depot Network</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {depots.length} service centers · {totalBays - occupiedBays} bays available of {totalBays} total
        </p>
      </div>

      {depots.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {depots.map((depot) => (
            <DepotCard key={depot.id} depot={depot} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-muted-foreground">
          <Building2 className="mb-3 h-8 w-8 opacity-40" />
          <p className="text-sm">No depot data available. Connect to a running API.</p>
        </div>
      )}
    </div>
  )
}
