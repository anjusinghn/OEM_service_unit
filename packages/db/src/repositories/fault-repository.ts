import type { Prisma, VehicleFault } from "@prisma/client"

import { prisma } from "../schema"

export type UpsertActiveFaultInput = Prisma.VehicleFaultUncheckedCreateInput

export const faultRepository = {
  findByVehicle(vehicleId: string): Promise<VehicleFault[]> {
    return prisma.vehicleFault.findMany({
      where: { vehicleId },
      orderBy: [{ isActive: "desc" }, { occurredAt: "desc" }]
    })
  },

  findActiveByVehicle(vehicleId: string): Promise<VehicleFault[]> {
    return prisma.vehicleFault.findMany({
      where: { vehicleId, isActive: true },
      orderBy: { occurredAt: "desc" }
    })
  },

  async upsertActiveFault(data: UpsertActiveFaultInput): Promise<VehicleFault> {
    const existing = await prisma.vehicleFault.findFirst({
      where: {
        vehicleId: data.vehicleId,
        dtcCode: data.dtcCode,
        isActive: true
      },
      orderBy: { occurredAt: "desc" }
    })

    if (!existing) {
      return prisma.vehicleFault.create({ data })
    }

    return prisma.vehicleFault.update({
      where: { id: existing.id },
      data: {
        subsystem: data.subsystem,
        severity: data.severity,
        title: data.title,
        description: data.description,
        occurredAt: data.occurredAt,
        occurrences: {
          increment: 1
        },
        isActive: true,
        resolvedAt: null
      }
    })
  },

  async resolveAllForVehicle(vehicleId: string, resolvedAt = new Date()): Promise<number> {
    const result = await prisma.vehicleFault.updateMany({
      where: {
        vehicleId,
        isActive: true
      },
      data: {
        isActive: false,
        resolvedAt
      }
    })

    return result.count
  }
}
