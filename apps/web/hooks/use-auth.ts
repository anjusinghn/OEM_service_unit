"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getToken, setToken, clearToken, parseToken, type JWTPayload } from "../lib/auth"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface LoginCredentials {
  email: string
  password: string
}

interface AuthState {
  user: JWTPayload | null
  token: string | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
}

export function useAuth(): AuthState {
  const router = useRouter()
  const [token, setTokenState] = useState<string | null>(null)
  const [user, setUser] = useState<JWTPayload | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const stored = getToken()
    if (stored) {
      setTokenState(stored)
      setUser(parseToken(stored))
    }
  }, [])

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      setIsLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { message?: string }).message ?? "Invalid credentials")
        }
        const data = (await res.json()) as { token: string; user: unknown }
        setToken(data.token)
        setTokenState(data.token)
        setUser(parseToken(data.token))
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    },
    [router],
  )

  const logout = useCallback(() => {
    clearToken()
    setTokenState(null)
    setUser(null)
    router.push("/login")
  }, [router])

  return { user, token, isLoading, login, logout }
}
