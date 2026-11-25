"use client"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

interface SectionCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function SectionCard({ title, description, action, children, className, bodyClassName }: SectionCardProps) {
  return (
    <section className={cn("glass-panel flex flex-col rounded-2xl", className)}>
      <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-tight text-foreground">{title}</h2>
          {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0 pt-0.5">{action}</div>}
      </div>
      <div className={cn("flex-1 p-6", bodyClassName)}>{children}</div>
    </section>
  )
}
