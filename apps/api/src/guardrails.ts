import type { NextFunction, Request, Response } from "express"

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"])

export type GuardrailOptions = {
  allowMutations: boolean
  exposeQueueAdmin: boolean
  rateLimitMax: number
  rateLimitWindowMs: number
  maxSseClients: number
  maxSsePerIp: number
  corsOrigins: string[]
}

export function resolveGuardrails(options: Partial<GuardrailOptions> = {}): GuardrailOptions {
  const fromEnv = (process.env.CORS_ORIGINS ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

  return {
    allowMutations: options.allowMutations ?? process.env.ALLOW_MUTATIONS === "true",
    exposeQueueAdmin: options.exposeQueueAdmin ?? process.env.ENABLE_QUEUE_ADMIN === "true",
    rateLimitMax: options.rateLimitMax ?? Number(process.env.RATE_LIMIT_MAX ?? 120),
    rateLimitWindowMs: options.rateLimitWindowMs ?? 60_000,
    maxSseClients: options.maxSseClients ?? 100,
    maxSsePerIp: options.maxSsePerIp ?? 3,
    corsOrigins: options.corsOrigins ?? fromEnv
  }
}

export function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown"
}

export function createRateLimiter(max: number, windowMs: number) {
  const buckets = new Map<string, { count: number; reset: number }>()

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now()
    if (buckets.size > 5000) {
      for (const [key, bucket] of buckets) {
        if (bucket.reset <= now) buckets.delete(key)
      }
    }

    const key = clientIp(req)
    let bucket = buckets.get(key)
    if (!bucket || bucket.reset <= now) {
      bucket = { count: 0, reset: now + windowMs }
      buckets.set(key, bucket)
    }
    bucket.count += 1

    const remaining = Math.max(0, max - bucket.count)
    res.setHeader("RateLimit-Limit", String(max))
    res.setHeader("RateLimit-Remaining", String(remaining))

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.reset - now) / 1000))))
      res.status(429).json({ error: "Too many requests" })
      return
    }

    next()
  }
}

export function rejectUnsafeRequests(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "TRACE" || req.method === "TRACK") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  if ((req.originalUrl?.length ?? 0) > 2048) {
    res.status(414).json({ error: "URI too long" })
    return
  }

  next()
}

export function rejectMutations(allowMutations: boolean) {
  return function mutationGuard(req: Request, res: Response, next: NextFunction): void {
    if (!allowMutations && MUTATING.has(req.method)) {
      res.status(403).json({ error: "This deployment is read-only" })
      return
    }
    next()
  }
}

export function readJsonError(error: unknown): { status: number; message: string } | null {
  if (!error || typeof error !== "object") return null
  const candidate = error as { type?: string; status?: number }
  if (candidate.type === "entity.too.large" || candidate.status === 413) {
    return { status: 413, message: "Request body too large" }
  }
  if (candidate.type === "entity.parse.failed" || (error instanceof SyntaxError && candidate.status === 400)) {
    return { status: 400, message: "Malformed JSON" }
  }
  return null
}
