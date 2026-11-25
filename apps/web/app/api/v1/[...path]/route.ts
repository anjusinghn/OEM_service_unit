import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

let session: { token: string; refreshAt: number } | undefined
let signingIn: Promise<string> | undefined

function getDemoToken(apiOrigin: string, password: string): Promise<string> {
  if (session && session.refreshAt > Date.now()) return Promise.resolve(session.token)
  if (!signingIn) {
    signingIn = (async () => {
      const response = await fetch(`${apiOrigin}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "oem@kazindustries.dev", password }),
        cache: "no-store",
        redirect: "error"
      })
      if (!response.ok) throw new Error("Could not initialize the local demo session")
      const { token } = await response.json() as { token: string }
      session = { token, refreshAt: Date.now() + 23 * 60 * 60 * 1_000 }
      return token
    })().finally(() => { signingIn = undefined })
  }
  return signingIn
}

async function proxy(request: NextRequest) {
  const demoOrigin = process.env.CHENNAI_DEMO_ORIGIN
  const apiOrigin = process.env.API_PROXY_URL
  const password = process.env.CHENNAI_DEMO_PASSWORD
  if (!demoOrigin || !apiOrigin || !password || process.env.SIMULATION_SCENARIO !== "chennai-ashok-leyland") {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const origin = request.headers.get("origin")
  if (request.headers.get("host") !== new URL(demoOrigin).host ||
      (origin && origin !== demoOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "This demo is available on localhost only." }, { status: 403 })
  }

  const { pathname, search } = request.nextUrl
  if (!pathname.startsWith("/api/v1/") || pathname.toLowerCase().startsWith("/api/v1/auth/")) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const body = request.method === "GET" ? undefined : await request.text()
  const send = (token: string) => fetch(`${apiOrigin}${pathname}${search}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": request.headers.get("content-type") ?? "application/json"
    },
    body,
    cache: "no-store",
    redirect: "error",
    signal: request.signal
  })

  try {
    let upstream = await send(await getDemoToken(apiOrigin, password))
    if (upstream.status === 401) {
      await upstream.body?.cancel()
      session = undefined
      upstream = await send(await getDemoToken(apiOrigin, password))
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store"
      }
    })
  } catch {
    return Response.json({ error: "The local simulation API is unavailable." }, { status: 503 })
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH }
