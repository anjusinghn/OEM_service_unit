import type { Prisma, Depot } from "@prisma/client"

import { prisma } from "../schema"

const depotInclude = {
  bays: true,
  technicians: true,
  inventory: {
    include: { part: true }
  }
} satisfies Prisma.DepotInclude

export const depotRepository = {
  findAll() {
    return prisma.depot.findMany({
      orderBy: [{ region: "asc" }, { city: "asc" }],
      include: depotInclude
    })
  },

  findByOrganization(organizationId: string) {
    return prisma.depot.findMany({
      where: { organizationId },
      orderBy: [{ region: "asc" }, { city: "asc" }],
      include: depotInclude
    })
  },

  findById(id: string) {
    return prisma.depot.findUnique({
      where: { id },
      include: depotInclude
    })
  },

  updateCapacity(id: string, occupiedBays: number): Promise<Depot> {
    return prisma.depot.update({
      where: { id },
      data: { occupiedBays }
    })
  },

  getAvailableBays(depotId: string) {
    return prisma.bay.findMany({
      where: {
        depotId,
        status: "AVAILABLE"
      },
      orderBy: { name: "asc" }
    })
  }
}
