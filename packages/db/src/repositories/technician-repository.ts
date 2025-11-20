import type { Technician } from "@prisma/client"

import { prisma } from "../schema"

export const technicianRepository = {
  findAll() {
    return prisma.technician.findMany({
      orderBy: [{ depotId: "asc" }, { name: "asc" }]
    })
  },

  findByDepot(depotId: string) {
    return prisma.technician.findMany({
      where: { depotId },
      orderBy: [{ currentLoad: "asc" }, { firstTimeFixRate: "desc" }, { name: "asc" }]
    })
  },

  updateWorkload(id: string, currentLoad: number): Promise<Technician> {
    return prisma.technician.update({
      where: { id },
      data: { currentLoad }
    })
  }
}
