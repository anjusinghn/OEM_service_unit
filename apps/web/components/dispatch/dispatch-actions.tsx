"use client"

import * as Dialog from "@radix-ui/react-dialog"
import * as Select from "@radix-ui/react-select"
import { ChevronDown, CircleCheck, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { apiPost, errorMessage } from "../../lib/api-client"
import { useDashboardStore } from "../../stores/dashboard-store"

interface Props {
  vehicleId: string
  recommendedDepotId?: string
  eligibleDepotIds?: string[]
  onCancel: () => void
}

export function DispatchActions({ vehicleId, recommendedDepotId, eligibleDepotIds, onCancel }: Props) {
  const router = useRouter()
  const allDepots = useDashboardStore((s) => s.depots)
  const depots = eligibleDepotIds ? allDepots.filter((depot) => eligibleDepotIds.includes(depot.id)) : allDepots
  const [loading, setLoading] = useState(false)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [overrideDepotId, setOverrideDepotId] = useState<string>("ai")

  const handleAccept = async () => {
    setLoading(true)
    try {
      await apiPost(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch`, recommendedDepotId ? { depotId: recommendedDepotId } : undefined)
      toast.success("Vehicle dispatched", {
        description: `${vehicleId} has been dispatched to the service depot.`,
      })
      router.push("/workflow")
    } catch (err) {
      toast.error("Dispatch not sent", {
        description: errorMessage(err, "Unable to dispatch vehicle."),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleModifyDispatch = async () => {
    setModifyOpen(false)
    setLoading(true)
    try {
      const body: Record<string, string> = {}
      if (overrideDepotId !== "ai") body.depotId = overrideDepotId
      else if (recommendedDepotId) body.depotId = recommendedDepotId
      await apiPost(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch`, body)
      toast.success("Vehicle dispatched", {
        description: `${vehicleId} has been dispatched with your overrides.`,
      })
      router.push("/workflow")
    } catch (err) {
      toast.error("Dispatch not sent", {
        description: errorMessage(err, "Unable to dispatch vehicle."),
      })
    } finally {
      setLoading(false)
    }
  }

  const itemClass =
    "relative flex cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-[15px] text-foreground outline-none data-[highlighted]:bg-accent"

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={handleAccept} disabled={loading} className="btn btn-sky">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <CircleCheck size={16} />}
        Accept &amp; dispatch
      </button>

      <Dialog.Root
        open={modifyOpen}
        onOpenChange={(open) => {
          setModifyOpen(open)
          if (open) setOverrideDepotId("ai")
        }}
      >
        <Dialog.Trigger asChild>
          <button type="button" className="btn btn-ghost">
            Change depot
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-950/70 backdrop-blur-sm" />
          <Dialog.Content className="glass-popover fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl p-7">
            <div className="mb-2 flex items-center justify-between">
              <Dialog.Title className="text-2xl font-semibold text-foreground">Change depot</Dialog.Title>
              <Dialog.Close className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-glass-hover hover:text-foreground">
                <X size={18} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="mb-6 text-[15px] text-muted-foreground">
              Override the recommended depot before dispatching.
            </Dialog.Description>

            <label htmlFor="modify-depot" className="label mb-2 block">
              Depot
            </label>
            <Select.Root value={overrideDepotId} onValueChange={setOverrideDepotId}>
              <Select.Trigger
                id="modify-depot"
                className="glass-input flex h-12 w-full items-center justify-between rounded-xl px-4 text-[15px]"
              >
                <Select.Value placeholder="Keep recommendation" />
                <Select.Icon>
                  <ChevronDown size={18} className="text-faint" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  position="popper"
                  sideOffset={8}
                  className="glass-popover z-[60] max-h-80 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl"
                >
                  <Select.Viewport className="p-1.5">
                    <Select.Item value="ai" className={itemClass}>
                      <Select.ItemText>Keep recommendation</Select.ItemText>
                    </Select.Item>
                    {depots.map((depot) => (
                      <Select.Item key={depot.id} value={depot.id} className={itemClass}>
                        <Select.ItemText>
                          {depot.name} — {depot.city}
                        </Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>

            <div className="mt-7 flex items-center justify-end gap-3">
              <Dialog.Close asChild>
                <button type="button" className="btn btn-ghost">
                  Cancel
                </button>
              </Dialog.Close>
              <button type="button" onClick={handleModifyDispatch} disabled={loading} className="btn btn-sky">
                {loading && <Loader2 size={16} className="animate-spin" />}
                Dispatch
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <button
        type="button"
        onClick={onCancel}
        className="px-2 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Start over
      </button>
    </div>
  )
}
