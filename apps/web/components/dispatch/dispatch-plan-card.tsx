import type { ReactNode } from "react"
import type { AiDispatchPlan } from "@kaz/shared"
import { CircleCheck, Clock, Copy, MapPin, TriangleAlert, Wrench } from "lucide-react"
import { cn } from "../../lib/cn"
import { useDashboardStore } from "../../stores/dashboard-store"

interface Props {
  plan: AiDispatchPlan
}

const urgencyStyles: Record<AiDispatchPlan["urgencyLevel"], string> = {
  routine: "border-healthy/25 bg-healthy-muted text-healthy",
  elevated: "border-watch/25 bg-watch-muted text-watch",
  urgent: "border-critical/25 bg-critical-muted text-critical",
  emergency: "border-critical/25 bg-critical-muted text-critical",
}

function Block({ icon, label, children, className }: { icon: ReactNode; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-6 py-5", className)}>
      <p className="label mb-3 flex items-center gap-2">
        {icon}
        {label}
      </p>
      {children}
    </div>
  )
}

export function DispatchPlanCard({ plan }: Props) {
  const depots = useDashboardStore((state) => state.depots)
  const depotName = (id: string) => depots.find((depot) => depot.id === id)?.name ?? id
  const confidencePct = Math.round(plan.confidence * 100)

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">Dispatch plan</h2>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", urgencyStyles[plan.urgencyLevel])}>
            {plan.urgencyLevel}
          </span>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm text-faint">
          {(!plan.candidates || plan.model) && <span className={cn(confidencePct >= 80 ? "text-healthy" : confidencePct >= 60 ? "text-watch" : "text-critical")}>
            {confidencePct}% confidence
          </span>}
          {plan.latencyMs !== null && <span>{(plan.latencyMs / 1000).toFixed(1)}s</span>}
          {plan.model && <span className="hidden md:inline">{plan.model}</span>}
        </div>
      </div>

      <div className="grid divide-y divide-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
        <Block icon={<MapPin size={15} className="text-sky-400" />} label="Depot">
          <p className="font-mono text-lg font-medium text-foreground">{depotName(plan.depotId)}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{plan.depotReasoning}</p>
        </Block>

        <Block icon={<Clock size={15} className="text-sky-400" />} label="Estimate">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-ink-950/40 px-4 py-3">
              <p className="text-xs text-faint">Repair time</p>
              <p className="stat mt-1 text-2xl text-foreground">{plan.estimatedRepairHours}h</p>
            </div>
            <div className="rounded-xl border border-border bg-ink-950/40 px-4 py-3">
              <p className="text-xs text-faint">Total cost</p>
              <p className="stat mt-1 text-2xl text-foreground">${plan.estimatedTotalCost.toLocaleString()}</p>
            </div>
          </div>
        </Block>
      </div>

      {plan.candidates && (
        <div className="overflow-x-auto border-t border-border px-6 py-5">
          <table className="w-full text-left text-sm">
            <caption className="label mb-3 text-left">Simulated workshop estimates (minutes)</caption>
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-4">Workshop</th>
                <th scope="col" className="py-2 pr-4">Travel</th>
                <th scope="col" className="py-2 pr-4">Parts ready</th>
                <th scope="col" className="py-2 pr-4">Repair</th>
                <th scope="col" className="py-2">Return to service</th>
              </tr>
            </thead>
            <tbody>
              {plan.candidates.map(({ depotId, schedule }) => schedule && (
                <tr key={depotId} className="border-t border-border">
                  <th scope="row" className="py-2 pr-4 font-medium">{depotName(depotId)}</th>
                  <td>{schedule.travelMinutes}</td>
                  <td>{schedule.partsReadyMinutes}</td>
                  <td>{schedule.repairMinutes}</td>
                  <td className={cn(depotId === plan.depotId && "font-semibold text-healthy")}>{schedule.returnToServiceMinutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(plan.partsToStage.length > 0 || plan.watchPoints.length > 0) && (
        <div className="grid divide-y divide-border border-t border-border lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {plan.partsToStage.length > 0 && (
            <Block icon={<Wrench size={15} className="text-sky-400" />} label="Parts to stage">
              <ul className="flex flex-col gap-2.5">
                {plan.partsToStage.map((part) => (
                  <li key={part} className="flex items-center gap-3 text-[15px] text-foreground">
                    <CircleCheck size={17} className="shrink-0 text-healthy" />
                    {part}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {plan.watchPoints.length > 0 && (
            <Block icon={<TriangleAlert size={15} className="text-watch" />} label="Watch points">
              <ul className="flex flex-col gap-2.5">
                {plan.watchPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-[15px] text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-watch" />
                    {point}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}

      {!plan.candidates && plan.alternativePlan && (
        <Block
          icon={<Copy size={15} className="text-faint" />}
          label="Alternative plan"
          className="border-t border-border bg-white/[0.02]"
        >
          <p className="font-mono text-base font-medium text-foreground">{plan.alternativePlan.depotId}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{plan.alternativePlan.reasoning}</p>
        </Block>
      )}
    </div>
  )
}
