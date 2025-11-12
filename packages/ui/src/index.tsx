import type { PropsWithChildren, ReactNode } from "react"
import { clsx } from "clsx"

export const SectionCard = ({
  title,
  eyebrow,
  actions,
  className,
  children
}: PropsWithChildren<{ title: string; eyebrow?: string; actions?: ReactNode; className?: string }>) => (
  <section className={clsx("panel", className)}>
    <header className="panel__header">
      <div className="panel__header-left">
        {eyebrow ? <div className="panel__eyebrow">{eyebrow}</div> : null}
        <h2 className="panel__title">{title}</h2>
      </div>
      {actions ? <div>{actions}</div> : null}
    </header>
    <div className="panel__body">
      {children}
    </div>
  </section>
)

export const MetricCard = ({
  label,
  value,
  tone = "default",
  detail
}: {
  label: string
  value: string | number
  tone?: "default" | "critical" | "watch" | "success"
  detail?: string
}) => (
  <div className={clsx("metric-card", `metric-card--${tone}`)}>
    <span className="metric-card__label">{label}</span>
    <strong className="metric-card__value">{value}</strong>
    {detail ? <span className="metric-card__detail">{detail}</span> : null}
  </div>
)

export const StatusPill = ({
  children,
  tone = "default"
}: PropsWithChildren<{ tone?: "default" | "critical" | "watch" | "success" | "info" }>) => (
  <span className={clsx("status-pill", `status-pill--${tone}`)}>{children}</span>
)
