"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BellRing, LogOut, Menu, Search } from "lucide-react"
import { useDashboardStore } from "../../stores/dashboard-store"
import { ALL_NAV_ITEMS, isActivePath } from "../../lib/nav"
import { cn } from "../../lib/cn"
import { useAuth } from "../../hooks/use-auth"
import { IS_CHENNAI_DEMO } from "../../lib/api-client"

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const sseConnected = useDashboardStore((s) => s.sseConnected)
  const alerts = useDashboardStore((s) => s.alerts)
  const criticalCount = alerts.filter((a) => a.severity === "critical" || a.severity === "safety").length
  const current = ALL_NAV_ITEMS.find((item) => isActivePath(pathname, item.href))

  return (
    <header className="glass-topbar sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-border px-4 sm:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-glass-hover hover:text-foreground lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      <div className="hidden items-center gap-2.5 text-[15px] sm:flex">
        <span className="text-faint">Fleet Command</span>
        <span className="text-ink-400">/</span>
        <span className="font-medium text-foreground">{current?.label ?? "Overview"}</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          className="glass-input hidden h-11 w-72 items-center gap-2.5 rounded-xl px-3.5 text-[15px] text-faint transition-colors hover:border-border-strong md:flex"
          onClick={() => {
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
          }}
        >
          <Search size={17} strokeWidth={1.75} />
          <span className="flex-1 text-left">Jump to a page…</span>
          <kbd className="rounded-md border border-border bg-white/5 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">⌘K</kbd>
        </button>

        <div
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.12em]",
            sseConnected
              ? "border-healthy/25 bg-healthy-muted text-healthy"
              : "border-border bg-white/5 text-muted-foreground"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", sseConnected ? "animate-pulse bg-healthy" : "bg-faint")} />
          {sseConnected ? "Live" : "Offline"}
        </div>

        <Link
          href="/alerts"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          aria-label="Alerts"
        >
          <BellRing size={19} strokeWidth={1.75} />
          {criticalCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1 font-mono text-[11px] font-medium text-critical-foreground">
              {criticalCount > 9 ? "9+" : criticalCount}
            </span>
          )}
        </Link>
        {!IS_CHENNAI_DEMO && user && (
          <button type="button" onClick={logout} className="btn btn-ghost btn-sm">
            <LogOut size={16} /> Sign out
          </button>
        )}
      </div>
    </header>
  )
}
