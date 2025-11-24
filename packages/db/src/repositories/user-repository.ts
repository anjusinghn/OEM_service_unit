import type { User, UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

import { prisma } from "../schema"

const SALT_ROUNDS = 12

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } })
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } })
  },

  async findByOrganization(organizationId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    })
  },

  async createWithPassword(data: {
    name: string
    email: string
    password: string
    role: UserRole
    organizationId: string
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS)
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        organizationId: data.organizationId
      }
    })
  },

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) return null
    const valid = await bcrypt.compare(password, user.passwordHash)
    return valid ? user : null
  },

  async updateRole(userId: string, role: UserRole): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { role }
    })
  },

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }
}
