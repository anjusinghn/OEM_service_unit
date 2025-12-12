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
            <legend className="text-xs font-medium text-foreground">Diagnosis correct?</legend>
            <div className="flex gap-2">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setDiagnosisCorrect(val)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    diagnosisCorrect === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cf-repair-duration" className="text-xs font-medium text-foreground">Actual repair hours</label>
            <input
              id="cf-repair-duration"
              type="number"
              min="0"
              step="0.5"
              value={repairDuration}
              onChange={(e) => setRepairDuration(e.target.value)}
              placeholder="e.g. 2.5"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus:ring-2"
            />
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-foreground">First-time fix?</legend>
            <div className="flex gap-2">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => setFirstTimeFix(val)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    firstTimeFix === val
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-foreground">Depot rating</legend>
            <StarRating value={depotRating} onChange={setDepotRating} />
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-foreground">Technician rating</legend>
            <StarRating value={technicianRating} onChange={setTechnicianRating} />
          </fieldset>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-foreground">Priority rating</legend>
            <StarRating value={priorityRating} onChange={setPriorityRating} />
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cf-tech-notes" className="text-xs font-medium text-foreground">Technician notes</label>
            <textarea
              id="cf-tech-notes"
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
                submitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
