"use client"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

interface SectionCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function SectionCard({ title, description, action, children, className }: SectionCardProps) {
  return (
    <div className={cn("glass-card rounded-xl", className)}>
      <div className="flex items-center justify-between border-b border-glass-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
