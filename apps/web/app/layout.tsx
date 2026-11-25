import type { Metadata, Viewport } from "next"
import type { ReactNode } from "react"
import localFont from "next/font/local"
import { Providers } from "../components/providers"

import "./globals.css"

const inter = localFont({
  src: "./fonts/inter.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
})

const stackNotch = localFont({
  src: "./fonts/stack-sans-notch.woff2",
  weight: "100 900",
  variable: "--font-stack-notch",
  display: "swap",
})

const dmMono = localFont({
  src: [
    { path: "./fonts/dm-mono-400.woff2", weight: "400" },
    { path: "./fonts/dm-mono-500.woff2", weight: "500" },
  ],
  variable: "--font-dm-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Fleet Command",
  description: "Service orchestration for commercial vehicle fleets.",
}

export const viewport: Viewport = {
  themeColor: "#06121c",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${stackNotch.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
