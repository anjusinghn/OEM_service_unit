"use client"
import type { ReactNode } from "react"
import { useRbac } from "../../hooks/use-rbac"

type Role = "PLATFORM_ADMIN" | "OEM_ADMIN" | "DEPOT_MANAGER" | "TECHNICIAN" | "VIEWER"

interface RoleGateProps {
  allowed: Role[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const { hasRole } = useRbac()
  if (!hasRole(...allowed)) return fallback
  return children
}

interface MinRoleGateProps {
  minRole: Role
  children: ReactNode
  fallback?: ReactNode
}

export function MinRoleGate({ minRole, children, fallback = null }: MinRoleGateProps) {
  const { hasMinRole } = useRbac()
  if (!hasMinRole(minRole)) return fallback
  return children
}
