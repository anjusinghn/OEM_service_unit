"use client"
import { useCallback, useEffect, useState } from "react"
import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { CornerDownLeft, Search } from "lucide-react"
import { ALL_NAV_ITEMS } from "../../lib/nav"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigate = useCallback(
    (path: string) => {
      router.push(path)
      setOpen(false)
    },
    [router]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close command palette"
        className="fixed inset-0 w-full cursor-default bg-ink-950/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-1/2 top-[18%] z-50 w-full max-w-xl -translate-x-1/2 px-4">
        <Command className="glass-popover overflow-hidden rounded-2xl">
          <div className="flex items-center gap-3 border-b border-border px-5">
            <Search className="h-5 w-5 shrink-0 text-faint" />
            <Command.Input
              autoFocus
              placeholder="Search pages…"
              className="h-14 w-full bg-transparent text-base text-foreground outline-none placeholder:text-faint"
            />
          </div>
          <Command.List className="max-h-[380px] overflow-y-auto p-2.5">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">No results found.</Command.Empty>
            <Command.Group
              heading="Pages"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-faint"
            >
              {ALL_NAV_ITEMS.map((route) => (
                <Command.Item
                  key={route.href}
                  value={route.label}
                  onSelect={() => navigate(route.href)}
                  className="group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-foreground aria-selected:bg-accent"
                >
                  <route.icon className="h-5 w-5 text-faint group-aria-selected:text-sky-400" strokeWidth={1.75} />
                  <span className="flex-1">{route.label}</span>
                  <CornerDownLeft className="h-4 w-4 text-faint opacity-0 group-aria-selected:opacity-100" />
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
