import type { Prisma, PriorityEntry, PrioritySnapshot } from "@prisma/client"

import { prisma } from "../schema"

export type PriorityEntryUpsertInput = Prisma.PriorityEntryUncheckedCreateInput
export type PrioritySnapshotCreateInput = Prisma.PrioritySnapshotCreateManyInput

export type PriorityQueueOptions = {
  limit?: number
  offset?: number
}

export const priorityRepository = {
  upsertCurrentEntry(data: PriorityEntryUpsertInput): Promise<PriorityEntry> {
    return prisma.priorityEntry.upsert({
      where: { vehicleId: data.vehicleId },
      create: data,
      update: {
        score: data.score,
        status: data.status,
        safetyUrgency: data.safetyUrgency,
        failureProximity: data.failureProximity,
        businessImpact: data.businessImpact,
        downtimeCost: data.downtimeCost,
        serviceWindow: data.serviceWindow,
        reasons: data.reasons,
        isOverridden: data.isOverridden,
        overriddenBy: data.overriddenBy
      }
    })
  },

  insertSnapshot(data: PrioritySnapshotCreateInput): Promise<PrioritySnapshot> {
    return prisma.prioritySnapshot.create({ data })
  },

  getQueue(options: PriorityQueueOptions = {}): Promise<PriorityEntry[]> {
    const { limit = 50, offset = 0 } = options

    return prisma.priorityEntry.findMany({
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      take: limit,
      skip: offset
    })
  },

  async getVehicleRank(vehicleId: string): Promise<number | null> {
    const entry = await prisma.priorityEntry.findUnique({
      where: { vehicleId },
      select: { score: true, updatedAt: true }
    })

    if (!entry) return null

    const ahead = await prisma.priorityEntry.count({
      where: {
        OR: [
          { score: { gt: entry.score } },
          {
            score: entry.score,
            updatedAt: { gt: entry.updatedAt }
          }
        ]
      }
    })

    return ahead + 1
  },

  getByVehicle(vehicleId: string): Promise<PriorityEntry | null> {
    return prisma.priorityEntry.findUnique({
      where: { vehicleId }
    })
  }
}
