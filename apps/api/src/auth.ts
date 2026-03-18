import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"
import { apiKeyRepository, userRepository } from "@kaz/db"

type UserRole = "PLATFORM_ADMIN" | "OEM_ADMIN" | "DEPOT_MANAGER" | "TECHNICIAN" | "VIEWER"

const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production"
const JWT_EXPIRES_IN = "24h"

export interface AuthPayload {
  userId: string
  email: string
  role: UserRole
  organizationId: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (header?.startsWith("Bearer ")) return header.slice(7)
  return null
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req)
  if (!token) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" })
    return
  }
  req.auth = payload
  next()
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required" })
      return
    }
    if (!roles.includes(req.auth.role)) {
      res.status(403).json({ error: "Insufficient permissions" })
      return
    }
    next()
  }
}

/**
 * Allows either Bearer JWT token OR API key (kaz_live_...) authentication.
 * API keys are scoped to an organization and grant PLATFORM_ADMIN-level access for that org.
 */
export function requireAuthOrApiKey(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req)
  if (!token) {
    res.status(401).json({ error: "Authentication required" })
    return
  }

  if (token.startsWith("kaz_live_")) {
    void apiKeyRepository.verify(token).then((key) => {
      if (!key) {
        res.status(401).json({ error: "Invalid or expired API key" })
        return
      }
      req.auth = {
        userId: `apikey:${key.id}`,
        email: `apikey-${key.name}@system`,
        role: "PLATFORM_ADMIN",
        organizationId: key.organizationId
      }
      next()
    }).catch(() => {
      res.status(500).json({ error: "API key verification failed" })
    })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" })
    return
  }
  req.auth = payload
  next()
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {}
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" })
    return
  }

  const user = await userRepository.verifyPassword(email, password)
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" })
    return
  }

  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  }

  const token = signToken(payload)
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId } })
}

export async function handleMe(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required" })
    return
  }
  const user = await userRepository.findById(req.auth.userId)
  if (!user) {
    res.status(404).json({ error: "User not found" })
    return
  }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, organizationId: user.organizationId })
}
