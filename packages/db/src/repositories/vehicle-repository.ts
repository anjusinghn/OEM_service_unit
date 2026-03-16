import type { Prisma, Vehicle } from "@prisma/client"

import { prisma } from "../schema"

const vehicleInclude = {
  affinityDepot: true,
  priorityEntry: true
} satisfies Prisma.VehicleInclude

export const vehicleRepository = {
  findAll() {
    return prisma.vehicle.findMany({
      orderBy: { id: "asc" },
      include: vehicleInclude
    })
  },

  findById(id: string) {
    return prisma.vehicle.findUnique({
      where: { id },
      include: vehicleInclude
    })
  },

  findByVin(vin: string) {
    return prisma.vehicle.findUnique({
      where: { vin },
      include: vehicleInclude
    })
  },

  updateCoordinates(id: string, latitude: number, longitude: number): Promise<Vehicle> {
    return prisma.vehicle.update({
      where: { id },
      data: { latitude, longitude }
    })
  }
}
