"use client"

import * as Dialog from "@radix-ui/react-dialog"
import * as Select from "@radix-ui/react-select"
import { CheckCircle2, ChevronDown, Loader2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { cn } from "../../lib/cn"
import { apiPost } from "../../lib/api-client"
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
    } catch (error) {
      toast.error("Dispatch failed", {
        description: error instanceof Error ? error.message : "Unable to dispatch vehicle.",
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
    } catch (error) {
      toast.error("Dispatch failed", {
        description: error instanceof Error ? error.message : "Unable to dispatch vehicle.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
          "bg-primary text-primary-foreground",
          "hover:opacity-90 transition-opacity",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CheckCircle2 size={14} />
        )}
        Accept &amp; Dispatch
      </button>

      <Dialog.Root open={modifyOpen} onOpenChange={(open) => {
        setModifyOpen(open)
        if (open) {
          setOverrideDepotId("ai")
        }
      }}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
              "bg-secondary text-secondary-foreground",
              "hover:opacity-90 transition-opacity"
            )}
          >
            Modify &amp; Dispatch
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content
            className={cn(
              "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
              "w-full max-w-lg glass-card rounded-xl p-6 shadow-xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
              "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-base font-semibold text-foreground">
                Modify Dispatch Plan
              </Dialog.Title>
              <Dialog.Close className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X size={16} />
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-sm text-muted-foreground mb-6">
              Override the recommended depot before dispatching.
            </Dialog.Description>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="modify-depot"
                  className="block text-xs font-medium text-foreground mb-1.5"
                >
                  Override Depot
                </label>
                <Select.Root value={overrideDepotId} onValueChange={setOverrideDepotId}>
                  <Select.Trigger
                    id="modify-depot"
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border border-input",
                      "bg-background px-3 py-2 text-sm text-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                  >
                    <Select.Value placeholder="Keep recommendation" />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="z-[60] rounded-md border border-border bg-popover p-1 shadow-lg">
                      <Select.Viewport>
                        <Select.Item
                          value="ai"
                          className="relative flex cursor-pointer select-none items-center rounded px-3 py-1.5 text-sm text-foreground outline-none hover:bg-accent focus:bg-accent"
                        >
                          <Select.ItemText>
                            Keep recommendation
                          </Select.ItemText>
                        </Select.Item>
                        {depots.map((depot) => (
                          <Select.Item
                            key={depot.id}
                            value={depot.id}
                            className="relative flex cursor-pointer select-none items-center rounded px-3 py-1.5 text-sm text-foreground outline-none hover:bg-accent focus:bg-accent"
                          >
                            <Select.ItemText>
                              {depot.name} — {depot.city}
                            </Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                onClick={handleModifyDispatch}
                disabled={loading}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold",
                  "bg-primary text-primary-foreground hover:opacity-90 transition-opacity",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Dispatch
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
