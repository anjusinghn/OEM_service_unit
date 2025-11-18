import type { Prisma, VehicleSignal } from "@prisma/client"

import { prisma } from "../schema"

export type SignalSnapshotCreateInput = Prisma.VehicleSignalCreateManyInput

export type SignalRangeOptions = {
  vehicleId: string
  from: Date
  to: Date
  limit?: number
}

export const signalRepository = {
  insertSnapshot(data: SignalSnapshotCreateInput): Promise<VehicleSignal> {
    return prisma.vehicleSignal.create({ data })
  },

  async insertMany(data: ReadonlyArray<SignalSnapshotCreateInput>): Promise<number> {
    if (!data.length) return 0

    const result = await prisma.vehicleSignal.createMany({
      data: [...data],
      skipDuplicates: true
    })

    return result.count
  },

  getLatest(vehicleId: string): Promise<VehicleSignal | null> {
    return prisma.vehicleSignal.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: "desc" }
    })
  },

  getRange(options: SignalRangeOptions): Promise<VehicleSignal[]> {
    const { vehicleId, from, to, limit = 500 } = options

    return prisma.vehicleSignal.findMany({
      where: {
        vehicleId,
        timestamp: { gte: from, lte: to }
      },
      orderBy: { timestamp: "asc" },
      take: limit
    })
  }
}
