"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { cn } from "../../lib/cn"
import { NAV_SECTIONS, SETTINGS_ITEM, isActivePath, type NavItem } from "../../lib/nav"
import { useDashboardStore } from "../../stores/dashboard-store"
import { FleetBrand } from "../brand/fleet-mark"

interface SidebarProps {
  open: boolean
  onClose: () => void
}

function NavLink({ item, active, badge, onClick }: { item: NavItem; active: boolean; badge?: number; onClick: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-200",
        active
          ? "bg-sidebar-accent text-sidebar-active shadow-[inset_0_0_0_1px_rgb(89_175_212/0.22)]"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active"
      )}
    >
      {active && (
        <span className="absolute -left-4 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-sky-300 to-sky-500" />
      )}
      <Icon
        size={19}
        strokeWidth={1.75}
        className={cn("shrink-0 transition-colors", active ? "text-sky-400" : "text-faint group-hover:text-sky-300")}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-critical-muted px-2 py-px font-mono text-xs font-medium text-critical">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  )
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const alerts = useDashboardStore((s) => s.alerts)
  const sseConnected = useDashboardStore((s) => s.sseConnected)
  const criticalAlerts = alerts.filter((a) => a.severity === "critical" || a.severity === "safety").length

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "glass-sidebar fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-sidebar-border",
          "transition-transform duration-300 ease-out lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-[72px] items-center justify-between px-6">
          <Link href="/" onClick={onClose} aria-label="Fleet Command home">
            <FleetBrand />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-hover lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-6 hairline opacity-70" />

        <nav className="flex flex-1 flex-col gap-7 overflow-y-auto px-4 py-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <p className="mb-1.5 px-3 font-mono text-[12px] font-medium uppercase tracking-[0.16em] text-faint">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActivePath(pathname, item.href)}
                  badge={item.href === "/alerts" ? criticalAlerts : undefined}
                  onClick={onClose}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-sidebar-border px-4 py-4">
          <NavLink item={SETTINGS_ITEM} active={isActivePath(pathname, SETTINGS_ITEM.href)} onClick={onClose} />
          <div className="glass-card flex items-center gap-3 rounded-xl px-3.5 py-3">
            <span className="relative flex h-2.5 w-2.5">
              {sseConnected && <span className="absolute inset-0 animate-ping rounded-full bg-healthy/60" />}
              <span className={cn("relative h-2.5 w-2.5 rounded-full", sseConnected ? "bg-healthy" : "bg-faint")} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{sseConnected ? "Telemetry live" : "Connecting…"}</p>
              <p className="text-xs text-faint">Read-only public view</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
