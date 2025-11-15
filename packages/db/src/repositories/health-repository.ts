import type { Prisma, VehicleHealthSnapshot } from "@prisma/client"

import { prisma } from "../schema"

export type HealthSnapshotCreateInput = Prisma.VehicleHealthSnapshotCreateManyInput

export type HealthTrendOptions = {
  vehicleId: string
  count?: number
}

export const healthRepository = {
  insertSnapshot(data: HealthSnapshotCreateInput): Promise<VehicleHealthSnapshot> {
    return prisma.vehicleHealthSnapshot.create({ data })
  },

  getLatest(vehicleId: string): Promise<VehicleHealthSnapshot | null> {
    return prisma.vehicleHealthSnapshot.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: "desc" }
    })
  },

  getTrend(options: HealthTrendOptions): Promise<VehicleHealthSnapshot[]> {
    const { vehicleId, count = 20 } = options

    return prisma.vehicleHealthSnapshot.findMany({
      where: { vehicleId },
      orderBy: { timestamp: "desc" },
      take: count
    })
  }
}
