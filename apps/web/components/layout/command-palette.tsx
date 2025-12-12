"use client"
import { useCallback, useEffect, useState } from "react"
import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard, Shield, Sparkles, GitBranch, Building2,
  Users, Brain, Bell, Settings, Search
} from "lucide-react"

const ROUTES = [
  { name: "Command Center", path: "/", icon: LayoutDashboard },
  { name: "Triage Queue", path: "/triage", icon: Shield },
  { name: "AI Dispatch", path: "/dispatch", icon: Sparkles },
  { name: "Workflow Board", path: "/workflow", icon: GitBranch },
  { name: "Depot Network", path: "/depots", icon: Building2 },
  { name: "Technicians", path: "/technicians", icon: Users },
  { name: "Decision Intelligence", path: "/intelligence", icon: Brain },
  { name: "Alerts", path: "/alerts", icon: Bell },
  { name: "Settings", path: "/settings", icon: Settings },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = useCallback((path: string) => {
    router.push(path)
    setOpen(false)
  }, [router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close command palette"
        className="fixed inset-0 w-full bg-black/50 backdrop-blur-sm cursor-default"
        onClick={() => setOpen(false)}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
      />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2">
        <Command className="glass-popover rounded-2xl border border-border shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search pages..."
              className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>
            <Command.Group heading="Pages" className="px-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {ROUTES.map((route) => (
                <Command.Item
                  key={route.path}
                  value={route.name}
                  onSelect={() => navigate(route.path)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-foreground aria-selected:bg-accent"
                >
                  <route.icon className="h-4 w-4 text-muted-foreground" />
                  {route.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
