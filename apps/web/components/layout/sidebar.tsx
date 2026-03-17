"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Brain,
  Building2,
  GitBranch,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { cn } from "../../lib/cn"

const navItems = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/triage", label: "Triage Queue", icon: Shield },
  { href: "/dispatch", label: "AI Dispatch", icon: Sparkles },
  { href: "/workflow", label: "Workflow", icon: GitBranch },
  { href: "/depots", label: "Depot Network", icon: Building2 },
  { href: "/technicians", label: "Technicians", icon: Users },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/alerts", label: "Alerts", icon: Bell },
]

const footerItems = [
  { href: "/settings", label: "Settings", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col",
          "bg-sidebar-bg",
          "transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              K
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight text-sidebar-active">
                kazindustries
              </span>
              <span className="text-[11px] font-medium leading-tight text-sidebar-foreground">
                Production
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-hover lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium",
                  "transition-colors duration-100",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-active font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active"
                )}
              >
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
                )}
                <Icon
                  size={17}
                  className={cn("flex-shrink-0", isActive ? "opacity-100" : "opacity-70")}
                />
                {label}
              </Link>
            )
          })}

          <div className="my-2 h-px bg-sidebar-border" />

          {footerItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium",
                  "transition-colors duration-100",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-active font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-active"
                )}
              >
                {isActive && (
                  <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
                )}
                <Icon
                  size={17}
                  className={cn("flex-shrink-0", isActive ? "opacity-100" : "opacity-70")}
                />
                {label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
