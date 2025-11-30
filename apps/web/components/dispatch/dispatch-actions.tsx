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
  onCancel: () => void
}

export function DispatchActions({ vehicleId, onCancel }: Props) {
  const router = useRouter()
  const depots = useDashboardStore((s) => s.depots)
  const [loading, setLoading] = useState(false)
  const [modifyOpen, setModifyOpen] = useState(false)
  const [overrideDepotId, setOverrideDepotId] = useState<string>("ai")

  const handleAccept = async () => {
    setLoading(true)
    try {
      await apiPost(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch`)
      toast.success("Vehicle dispatched", {
        description: `${vehicleId} has been dispatched to the service depot.`,
      })
      router.push("/workflow")
    } catch {
      toast.error("Dispatch failed", {
        description: "Unable to dispatch vehicle. Please try again.",
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
      await apiPost(`/api/v1/orchestration/vehicles/${vehicleId}/dispatch`, body)
      toast.success("Vehicle dispatched", {
        description: `${vehicleId} has been dispatched with your overrides.`,
      })
      router.push("/workflow")
    } catch {
      toast.error("Dispatch failed", {
        description: "Unable to dispatch vehicle. Please try again.",
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
