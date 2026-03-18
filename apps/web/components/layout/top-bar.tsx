"use client"
import { Bell, Menu, Search, LogOut, ChevronDown } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useDashboardStore } from "../../stores/dashboard-store"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "../../lib/cn"
import { useAuth } from "../../hooks/use-auth"

interface TopBarProps {
  onMenuClick: () => void
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const sseConnected = useDashboardStore((s) => s.sseConnected)
  const alerts = useDashboardStore((s) => s.alerts)
  const criticalCount = alerts.filter((a) => a.severity === "critical").length
  const { user, logout } = useAuth()

  const displayName = user?.email?.split("@")[0] ?? "Account"
  const initials = displayName.slice(0, 2).toUpperCase()

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

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus:outline-none"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
                {initials}
              </div>
              <span className="hidden max-w-[96px] truncate text-[12px] font-medium text-foreground sm:block">
                {displayName}
              </span>
              <ChevronDown size={12} className="hidden shrink-0 sm:block" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[188px] rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
            >
              <div className="px-2.5 py-1.5">
                <p className="text-[11px] font-medium text-foreground">{displayName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user?.email ?? ""}</p>
              </div>

              <DropdownMenu.Separator className="my-1 h-px bg-border" />

              {user?.role && (
                <>
                  <div className="px-2.5 py-1">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      {user.role}
                    </span>
                  </div>
                  <DropdownMenu.Separator className="my-1 h-px bg-border" />
                </>
              )}

              <DropdownMenu.Item
                onSelect={logout}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-destructive outline-none transition-colors hover:bg-destructive/10 focus:bg-destructive/10"
              >
                <LogOut size={13} />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
