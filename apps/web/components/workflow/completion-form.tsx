"use client"

import { useState } from "react"
import type { ServiceCompletionInput } from "@kaz/shared"
import { apiPost, errorMessage } from "@/lib/api-client"
import { cn } from "@/lib/cn"
import { Star, X } from "lucide-react"
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
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const on = value !== null && star <= value
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className="rounded-md p-0.5 transition-transform hover:scale-110"
          >
            <Star size={24} strokeWidth={1.5} className={on ? "fill-sky-400 text-sky-400" : "text-ink-400 hover:text-sky-300"} />
          </button>
        )
      })}
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
    } catch (err) {
      toast.error("Could not complete request", { description: errorMessage(err, "Please try again.") })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleClass = (selected: boolean) =>
    cn(
      "flex-1 rounded-xl border px-4 py-2.5 text-[15px] font-medium transition-colors",
      selected ? "border-sky-500/50 bg-accent text-foreground" : "border-border bg-white/[0.03] text-muted-foreground hover:text-foreground"
    )
  const inputClass = "glass-input h-12 rounded-xl px-4 text-[15px]"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm">
      <div className="glass-popover relative w-full max-w-lg rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-7 py-5">
          <div>
            <p className="eyebrow">{requestId}</p>
            <h2 className="mt-1.5 text-2xl font-semibold text-foreground">Complete service</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-glass-hover hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto px-7 py-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="cf-actual-fault" className="label">Actual fault</label>
            <input
              id="cf-actual-fault"
              type="text"
              maxLength={200}
              value={actualFault}
              onChange={(e) => setActualFault(e.target.value)}
              placeholder="What was actually wrong"
              className={inputClass}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-2">Diagnosis correct?</legend>
            <div className="flex gap-2">
              {([true, false] as const).map((val) => (
                <button key={String(val)} type="button" onClick={() => setDiagnosisCorrect(val)} className={toggleClass(diagnosisCorrect === val)}>
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="cf-repair-duration" className="label">Repair hours</label>
            <input
              id="cf-repair-duration"
              type="number"
              min="0"
              max="10000"
              step="0.5"
              value={repairDuration}
              onChange={(e) => setRepairDuration(e.target.value)}
              placeholder="e.g. 2.5"
              className={inputClass}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="label mb-2">First-time fix?</legend>
            <div className="flex gap-2">
              {([true, false] as const).map((val) => (
                <button key={String(val)} type="button" onClick={() => setFirstTimeFix(val)} className={toggleClass(firstTimeFix === val)}>
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-2">Depot</legend>
              <StarRating value={depotRating} onChange={setDepotRating} />
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-2">Technician</legend>
              <StarRating value={technicianRating} onChange={setTechnicianRating} />
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-2">Priority</legend>
              <StarRating value={priorityRating} onChange={setPriorityRating} />
            </fieldset>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="cf-tech-notes" className="label">Technician notes</label>
            <textarea
              id="cf-tech-notes"
              value={technicianNotes}
              maxLength={2000}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              placeholder="Anything the next technician should know"
              rows={3}
              className="glass-input resize-none rounded-xl px-4 py-3 text-[15px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-sky">
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
