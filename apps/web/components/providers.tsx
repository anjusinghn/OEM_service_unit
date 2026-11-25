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
      <Toaster
        position="top-right"
        theme="dark"
        closeButton
        toastOptions={{
          style: {
            background: "#0d2231",
            border: "1px solid rgb(202 229 241 / 0.18)",
            color: "#f0f5f7",
            fontSize: "15px",
            borderRadius: "14px",
          },
        }}
      />
    </QueryClientProvider>
  )
}
