const TOKEN_KEY = "kaz_auth_token"

export interface JWTPayload {
  userId: string
  email: string
  role: string
  organizationId: string
  exp?: number
  iat?: number
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  // Cookie required for middleware route protection — httpOnly not possible from JS
  const maxAge = 60 * 60 * 24 * 7
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`
}

export function isAuthenticated(): boolean {
  return getToken() !== null
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export function parseToken(token: string): JWTPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decoded) as JWTPayload
  } catch {
    return null
  }
}
