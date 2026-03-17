import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Outfit, IBM_Plex_Mono } from "next/font/google"
import { Providers } from "../components/providers"

import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  title: "kazindustries",
  description: "Service orchestration layer for OEM aftersales.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
