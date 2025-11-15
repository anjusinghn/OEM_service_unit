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
    <div className="flex min-h-screen bg-background/50">
      <CommandPalette />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-[248px]">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
