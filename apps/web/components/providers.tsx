"use client"
import { QueryClientProvider } from "@tanstack/react-query"
import { getQueryClient } from "../lib/query-client"
import { Toaster } from "sonner"
import type { ReactNode } from "react"

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  )
}
