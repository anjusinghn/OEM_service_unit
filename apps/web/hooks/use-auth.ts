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

