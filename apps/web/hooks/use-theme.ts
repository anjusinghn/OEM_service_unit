"use client"
import { useCallback, useEffect, useState } from "react"

type Theme = "light" | "dark"

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light")

  useEffect(() => {
    setThemeState("dark")
    document.documentElement.classList.add("dark")
    localStorage.setItem("kaz-theme", "dark")
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    localStorage.setItem("kaz-theme", t)
    document.documentElement.classList.toggle("dark", t === "dark")
  }, [])

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return { theme, setTheme, toggle }
}
