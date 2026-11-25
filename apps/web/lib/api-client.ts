import { getAuthHeaders } from "./auth"

export const IS_CHENNAI_DEMO = process.env.NEXT_PUBLIC_CHENNAI_DEMO === "true"
const API_BASE = IS_CHENNAI_DEMO ? "" : (process.env.NEXT_PUBLIC_API_URL ?? "")

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(IS_CHENNAI_DEMO ? {} : getAuthHeaders()),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null
    const message = typeof body?.error === "string" ? body.error : `Request failed (${res.status})`
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  })
}

export const API_BASE_URL = API_BASE
