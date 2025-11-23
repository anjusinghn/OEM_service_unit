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
