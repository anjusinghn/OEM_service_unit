import {
  BellRing,
  BrainCircuit,
  HardHat,
  LayoutDashboard,
  Route,
  Settings2,
  Siren,
  SquareKanban,
  Warehouse,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operate",
    items: [
      { href: "/", label: "Command Center", icon: LayoutDashboard },
      { href: "/triage", label: "Triage Queue", icon: Siren },
      { href: "/dispatch", label: "AI Dispatch", icon: Route },
      { href: "/workflow", label: "Workflow", icon: SquareKanban },
    ],
  },
  {
    title: "Network",
    items: [
      { href: "/depots", label: "Depots", icon: Warehouse },
      { href: "/technicians", label: "Technicians", icon: HardHat },
    ],
  },
  {
    title: "Insight",
    items: [
      { href: "/intelligence", label: "Intelligence", icon: BrainCircuit },
      { href: "/alerts", label: "Alerts", icon: BellRing },
    ],
  },
]

export const SETTINGS_ITEM: NavItem = { href: "/settings", label: "Settings", icon: Settings2 }

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_SECTIONS.flatMap((s) => s.items), SETTINGS_ITEM]

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}
