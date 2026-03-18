import type { ApiKey } from "@prisma/client"
import { createHash, randomBytes } from "node:crypto"

import { prisma } from "../schema"

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

export const apiKeyRepository = {
  /** Generate a new API key, returning both the raw key (show once) and the record. */
  async create(data: {
    organizationId: string
    name: string
    expiresAt?: Date
  }): Promise<{ raw: string; record: ApiKey }> {
    const raw = `kaz_live_${randomBytes(24).toString("hex")}`
    const keyHash = hashKey(raw)
    const record = await prisma.apiKey.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        keyHash,
        expiresAt: data.expiresAt ?? null
      }
    })
    return { raw, record }
  },

  /** Validate a raw API key. Returns the key record if valid and not expired. */
  async verify(rawKey: string): Promise<ApiKey | null> {
    const keyHash = hashKey(rawKey)
    const key = await prisma.apiKey.findUnique({ where: { keyHash } })
    if (!key) return null
    if (key.expiresAt && key.expiresAt < new Date()) return null
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() }
    }).catch(() => {})
    return key
  },

  async findByOrganization(organizationId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    })
  },

  async revoke(id: string): Promise<void> {
    await prisma.apiKey.delete({ where: { id } })
  }
}
