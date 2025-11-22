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
  { href: "/", label: "Command Center", icon: LayoutDashboard, color: "text-indigo-400/70" },
  { href: "/triage", label: "Triage Queue", icon: Shield, color: "text-rose-400/70" },
  { href: "/dispatch", label: "AI Dispatch", icon: Sparkles, color: "text-violet-400/70" },
  { href: "/workflow", label: "Workflow", icon: GitBranch, color: "text-sky-400/70" },
  { href: "/depots", label: "Depot Network", icon: Building2, color: "text-emerald-400/70" },
  { href: "/technicians", label: "Technicians", icon: Users, color: "text-amber-400/70" },
  { href: "/intelligence", label: "Intelligence", icon: Brain, color: "text-fuchsia-400/70" },
  { href: "/alerts", label: "Alerts", icon: Bell, color: "text-orange-400/70" },
]

const footerItems = [
  { href: "/settings", label: "Settings", icon: Settings, color: "text-zinc-400/70" },
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
          "glass-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between px-5 pb-7 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
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
