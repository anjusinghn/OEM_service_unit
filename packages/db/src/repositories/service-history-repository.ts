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
