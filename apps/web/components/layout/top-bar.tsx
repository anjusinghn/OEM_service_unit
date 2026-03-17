"use client"
import { Bell, Menu, Search } from "lucide-react"
import { useDashboardStore } from "../../stores/dashboard-store"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "../../lib/cn"

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const sseConnected = useDashboardStore((s) => s.sseConnected)
  const alerts = useDashboardStore((s) => s.alerts)
  const criticalCount = alerts.filter((a) => a.severity === "critical").length

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu size={18} />
      </button>

      <div className="flex items-center gap-3 ml-auto">
        <button
          type="button"
          className="hidden items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground sm:flex"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
          }}
        >
          <Search className="h-3 w-3" />
          Search
          <kbd className="ml-1 rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </button>

        <div
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            sseConnected
              ? "bg-healthy-muted text-healthy"
              : "bg-critical-muted text-critical"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              sseConnected ? "animate-pulse bg-healthy" : "bg-critical"
            )}
          />
          {sseConnected ? "Live" : "Offline"}
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell size={17} />
          </button>
          {criticalCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-critical text-[10px] font-bold text-critical-foreground">
              {criticalCount > 9 ? "9+" : criticalCount}
            </span>
          )}
        </div>

        <ThemeToggle />
      </div>
    </header>
  )
}
