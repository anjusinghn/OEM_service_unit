import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Outfit, IBM_Plex_Mono } from "next/font/google"

import "./globals.css"

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"]
})

export const metadata: Metadata = {
  title: "kazindustries",
  description: "Service orchestration layer for OEM aftersales."
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${mono.variable}`}>{children}</body>
    </html>
  )
}
