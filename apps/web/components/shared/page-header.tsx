import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

interface PageHeaderProps {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 text-[34px] font-semibold leading-[1.08] text-foreground sm:text-[40px]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-[17px]">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      <div className="hairline" />
    </header>
  )
}
