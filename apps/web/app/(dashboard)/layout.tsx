"use client"
import { useState } from "react"
import type { ReactNode } from "react"
import { Sidebar } from "../../components/layout/sidebar"
import { TopBar } from "../../components/layout/top-bar"
import { CommandPalette } from "../../components/layout/command-palette"
import { ErrorBoundary } from "../../components/shared/error-boundary"
import { useSSE } from "../../hooks/use-sse"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useSSE()

  return (
    <div className="flex min-h-screen">
      <CommandPalette />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1 lg:ml-[272px]">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-10 sm:px-8 lg:px-10">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
