"use client"

import { Eye, Gauge, Lock, ShieldCheck, Timer } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { IS_CHENNAI_DEMO } from "@/lib/api-client"
import { SectionCard } from "@/components/shared/section-card"

const PRIORITY_WEIGHTS = [
  { factor: "Safety urgency", weight: 30 },
  { factor: "Failure proximity", weight: 25 },
  { factor: "Business impact", weight: 20 },
  { factor: "Downtime cost", weight: 15 },
  { factor: "Service window", weight: 10 },
]

const GUARDRAILS = [
  { icon: Eye, title: "Read-only by default", body: "All write requests are refused unless the operator enables them on the server." },
  { icon: Gauge, title: "Rate limited", body: "Each visitor gets a fixed request budget per minute; bursts receive a 429." },
  { icon: Timer, title: "Bounded connections", body: "Request bodies, URLs, timeouts, and live-stream connections are all capped." },
  { icon: Lock, title: "Admin surfaces hidden", body: "Queue admin and demo reset are disabled on public deployments." },
]

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-ink-950/40 px-5 py-4">
      <p className="label">{label}</p>
      <p className={mono ? "mt-2 font-mono text-base text-foreground" : "mt-2 text-base font-medium text-foreground"}>{value}</p>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Settings"
        title={
          <>
            How Fleet Command <span className="text-gradient">makes its calls.</span>
          </>
        }
        description={IS_CHENNAI_DEMO ? "Priority weights and dispatch settings for the Chennai simulation." : "Priority weights, AI configuration, and the protections on this public deployment."}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Priority weights" description="How each factor contributes to a vehicle's urgency score">
          <div className="flex flex-col gap-5">
            {PRIORITY_WEIGHTS.map((item) => (
              <div key={item.factor}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[15px] text-foreground">{item.factor}</span>
                  <span className="font-mono text-[15px] text-muted-foreground">{item.weight}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-300"
                    style={{ width: `${(item.weight / 30) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="AI configuration" description="Model used for triage and dispatch reasoning">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Dispatch" value={IS_CHENNAI_DEMO ? "Rule-based by default" : "AI enabled"} />
            <Field label="Provider" value="OpenRouter" />
            <div className="sm:col-span-2">
              <Field label="Model" value="z-ai/glm-4.5-air:free" mono />
            </div>
          </div>
        </SectionCard>
      </div>

      {IS_CHENNAI_DEMO ? (
        <SectionCard title="Local simulation" description="Ashok Leyland fleet · Greater Chennai">
          <p className="text-[15px] text-muted-foreground">Dispatch and repair actions are enabled for simulated vehicles and workshops.</p>
        </SectionCard>
      ) : <SectionCard
        title="Public access"
        description="This deployment is open to anyone and locked against changes"
        action={
          <span className="chip border-sky-500/25 text-sky-300">
            <ShieldCheck size={15} /> Protected
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {GUARDRAILS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass-card flex items-start gap-4 rounded-xl p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-accent text-sky-400">
                <Icon size={20} strokeWidth={1.75} />
              </span>
              <div>
                <p className="text-base font-semibold text-foreground">{title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>}
    </div>
  )
}
