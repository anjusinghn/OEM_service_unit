"use client"

import { useState } from "react"
import type { ServiceCompletionInput } from "@kaz/shared"
import { apiPost } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { X } from "lucide-react"
import { toast } from "sonner"

interface CompletionFormProps {
  requestId: string
  onClose: () => void
  onComplete: () => void
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={cn(
            "text-xl leading-none transition-colors",
            value !== null && star <= value ? "text-yellow-400" : "text-muted-foreground/30 hover:text-yellow-300"
          )}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function CompletionForm({ requestId, onClose, onComplete }: CompletionFormProps) {
  const [actualFault, setActualFault] = useState("")
  const [diagnosisCorrect, setDiagnosisCorrect] = useState<boolean | null>(null)
  const [repairDuration, setRepairDuration] = useState("")
  const [firstTimeFix, setFirstTimeFix] = useState<boolean | null>(null)
  const [depotRating, setDepotRating] = useState<number | null>(null)
  const [technicianRating, setTechnicianRating] = useState<number | null>(null)
  const [priorityRating, setPriorityRating] = useState<number | null>(null)
  const [technicianNotes, setTechnicianNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload: ServiceCompletionInput = {
      actualFault: actualFault || null,
      diagnosisCorrect,
      repairDuration: repairDuration ? parseFloat(repairDuration) : null,
      firstTimeFix,
      depotRating,
      technicianRating,
      priorityRating,
      technicianNotes: technicianNotes || null,
    }

    try {
      await apiPost(`/api/v1/service-requests/${requestId}/complete`, payload)
      toast.success("Service request completed")
      onComplete()
      onClose()
    } catch {
      toast.error("Failed to complete request")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
      <div className="relative w-full max-w-md glass-card rounded-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Complete Service Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cf-actual-fault" className="text-xs font-medium text-foreground">Actual fault</label>
            <input
              id="cf-actual-fault"
              type="text"
              value={actualFault}
              onChange={(e) => setActualFault(e.target.value)}
              placeholder="Describe the actual fault found"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>

          <fieldset className="flex flex-col gap-1.5">
