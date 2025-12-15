import type { Prisma, ServiceHistory } from "@prisma/client"

import { prisma } from "../schema"

export type CreateServiceHistoryInput = Prisma.ServiceHistoryUncheckedCreateInput

export type ServiceHistoryOutcomeStats = {
  totalRecords: number
  firstTimeFixRate: number
  avgRepairDurationHours: number | null
}

export type OutcomeStatsFilter = {
  vehicleId?: string
  depotId?: string
  technicianId?: string
  subsystem?: string
}

const buildWhere = (filter: OutcomeStatsFilter = {}): Prisma.ServiceHistoryWhereInput => ({
  ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
  ...(filter.depotId ? { depotId: filter.depotId } : {}),
  ...(filter.technicianId ? { technicianId: filter.technicianId } : {}),
  ...(filter.subsystem ? { subsystem: filter.subsystem } : {})
})

export const serviceHistoryRepository = {
  create(data: CreateServiceHistoryInput): Promise<ServiceHistory> {
    return prisma.serviceHistory.create({ data })
  },

  findByVehicle(vehicleId: string): Promise<ServiceHistory[]> {
    return prisma.serviceHistory.findMany({
      where: { vehicleId },
      orderBy: { resolvedAt: "desc" }
    })
  },

  findRecent(limit = 20): Promise<ServiceHistory[]> {
    return prisma.serviceHistory.findMany({
      orderBy: { resolvedAt: "desc" },
      take: limit
    })
  },

  async getOutcomeStats(filter: OutcomeStatsFilter = {}): Promise<ServiceHistoryOutcomeStats> {
    const where = buildWhere(filter)

    const [totalRecords, firstTimeFixCount, aggregate] = await Promise.all([
      prisma.serviceHistory.count({ where }),
      prisma.serviceHistory.count({
        where: {
          ...where,
          firstTimeFix: true
        }
      }),
      prisma.serviceHistory.aggregate({
        where,
        _avg: {
          repairDuration: true
        }
      })
    ])

    return {
      totalRecords,
      firstTimeFixRate: totalRecords ? firstTimeFixCount / totalRecords : 0,
      avgRepairDurationHours: aggregate._avg.repairDuration ?? null
    }
  }
}
