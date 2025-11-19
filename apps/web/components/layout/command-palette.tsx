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
