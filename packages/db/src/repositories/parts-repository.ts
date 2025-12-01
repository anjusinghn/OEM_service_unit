import type { InventoryItem, Part, PartReservation, Prisma } from "@prisma/client"

import { prisma } from "../schema"

export type ReservePartInput = {
  serviceRequestId: string
  depotId: string
  partNumber: string
  quantity?: number
  expiresAt?: Date
}

export const partsRepository = {
  getCatalog(): Promise<Part[]> {
    return prisma.part.findMany({
      orderBy: [{ subsystem: "asc" }, { name: "asc" }]
    })
  },

  getInventory() {
    return prisma.inventoryItem.findMany({
      orderBy: [{ depotId: "asc" }, { partNumber: "asc" }],
      include: { part: true, depot: true }
    })
  },

  findInventoryByDepot(depotId: string) {
    return prisma.inventoryItem.findMany({
      where: { depotId },
      orderBy: { partNumber: "asc" },
      include: { part: true }
    })
  },

  reservePart(input: ReservePartInput): Promise<PartReservation> {
    const { serviceRequestId, depotId, partNumber, quantity = 1, expiresAt } = input

    return prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryItem.findUnique({
        where: {
          depotId_partNumber: {
            depotId,
            partNumber
          }
        }
      })

      if (!inventory || inventory.quantity < quantity) {
        throw new Error(`Insufficient inventory for ${partNumber} at ${depotId}`)
      }

      await tx.inventoryItem.update({
        where: {
          depotId_partNumber: {
