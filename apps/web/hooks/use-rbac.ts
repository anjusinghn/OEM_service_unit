"use client"
import { useAuth } from "./use-auth"

type Role = "PLATFORM_ADMIN" | "OEM_ADMIN" | "DEPOT_MANAGER" | "TECHNICIAN" | "VIEWER"

const ROLE_HIERARCHY: Record<Role, number> = {
  PLATFORM_ADMIN: 100,
  OEM_ADMIN: 80,
  DEPOT_MANAGER: 60,
  TECHNICIAN: 40,
  VIEWER: 20
}

export function useRbac() {
  const { user } = useAuth()
  const role = (user?.role ?? "VIEWER") as Role

  const hasRole = (...roles: Role[]) => roles.includes(role)

  const hasMinRole = (minRole: Role) =>
    (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0)

  const canDispatch = hasMinRole("DEPOT_MANAGER")
  const canManageUsers = hasMinRole("OEM_ADMIN")
  const canViewIntelligence = hasMinRole("VIEWER")
  const canResetDemo = role === "PLATFORM_ADMIN"
  const canAdvanceWorkflow = hasMinRole("TECHNICIAN")
  const canManagePatterns = hasMinRole("OEM_ADMIN")

  return {
    role,
    hasRole,
    hasMinRole,
    canDispatch,
    canManageUsers,
    canViewIntelligence,
    canResetDemo,
    canAdvanceWorkflow,
    canManagePatterns
  }
}
