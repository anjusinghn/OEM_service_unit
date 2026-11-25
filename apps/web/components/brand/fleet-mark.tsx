import { useId } from "react"
import { cn } from "@/lib/cn"

export function FleetMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "")
  const ink = `fc-ink-${id}`
  const tile = `fc-tile-${id}`

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={ink} x1="4" y1="6" x2="28" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f0f5f7" />
          <stop offset="0.45" stopColor="#cce6f1" />
          <stop offset="0.75" stopColor="#7fc4e2" />
          <stop offset="1" stopColor="#59afd4" />
        </linearGradient>
        <linearGradient id={tile} x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#182d47" />
          <stop offset="1" stopColor="#0a1b27" />
        </linearGradient>
      </defs>
      <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8.5" fill={`url(#${tile})`} stroke="rgb(202 229 241 / 0.26)" strokeWidth="1" />
      <path d="M7.5 9.5h10.5" stroke={`url(#${ink})`} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M7.5 9.5v13" stroke={`url(#${ink})`} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M7.5 16h7" stroke={`url(#${ink})`} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M19 15.5l5.5 3.5-5.5 3.5" fill="none" stroke="#59afd4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function FleetBrand({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const mark = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-9 w-9"
  const word = size === "lg" ? "text-[26px]" : size === "sm" ? "text-[17px]" : "text-[20px]"

  return (
    <span className={cn("inline-flex items-center gap-2.5 text-frost select-none", className)}>
      <FleetMark className={cn(mark, "shrink-0")} />
      <span className={cn("font-display font-medium leading-none tracking-[-0.02em] whitespace-nowrap", word)}>
        Fleet Command
      </span>
    </span>
  )
}
