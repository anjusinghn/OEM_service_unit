import type { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

import {
  assertChennaiStorage,
  CHENNAI_ORG_ID,
  CHENNAI_COOLING_PART,
  CHENNAI_SCENARIO,
  chennaiCoolingFault,
  chennaiFrame,
  chennaiInventory,
  chennaiParts,
  chennaiTechnicians,
  chennaiVehicles,
  chennaiWorkshops
} from "@kaz/shared"

export async function seedChennai(db: PrismaClient) {
  assertChennaiStorage(process.env.DATABASE_URL, process.env.REDIS_URL)
  const nearPartInStock = process.env.CHENNAI_NEAR_PART_IN_STOCK === "true"
  const passwordHash = await bcrypt.hash("kazadmin123", 12)

  await db.$transaction(async (tx) => {
    // Two startup processes must not seed the same database concurrently.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1117276)`
    const organizations = await tx.organization.findMany({ select: { id: true } })
    if (organizations.some((organization) => organization.id !== CHENNAI_ORG_ID)) {
      throw new Error("Chennai seed requires its own database.")
    }
    if (organizations.length) {
      if (process.env.CHENNAI_NEAR_PART_IN_STOCK !== undefined) {
        const part = chennaiInventory(nearPartInStock).find((item) =>
          item.depotId === "chennai-poonamallee" && item.partNumber === CHENNAI_COOLING_PART)!
        await tx.inventoryItem.update({
          where: { depotId_partNumber: { depotId: part.depotId, partNumber: part.partNumber } },
          data: { quantity: part.quantity }
        })
      }
      return
    }

    await tx.organization.create({ data: { id: CHENNAI_ORG_ID, name: "Ashok Leyland Chennai Simulation" } })
    await tx.user.createMany({ data: [
      { name: "Demo Administrator", email: "admin@kazindustries.dev", role: "PLATFORM_ADMIN" as const },
      { name: "Demo Fleet Manager", email: "oem@kazindustries.dev", role: "OEM_ADMIN" as const }
    ].map((user) => ({ ...user, organizationId: CHENNAI_ORG_ID, passwordHash })) })

    await tx.oemConnection.create({ data: {
      id: CHENNAI_SCENARIO, organizationId: CHENNAI_ORG_ID, name: "Simulated Ashok Leyland telemetry",
      adapterType: "mock", status: "CONNECTED", config: { vehicleCount: chennaiVehicles.length, nearPartInStock }
    } })
    await tx.dtcCode.create({ data: {
      code: chennaiCoolingFault.dtcCode, description: chennaiCoolingFault.description, system: "Cooling", subsystem: "COOLING", severity: "WARNING",
      knownCauses: ["Scripted coolant pump fault"], remedies: ["Simulated pump replacement"], relatedCodes: []
    } })
    await tx.depot.createMany({ data: chennaiWorkshops.map(({ coordinates, address, map, source, pin, ...depot }) => ({
      ...depot, organizationId: CHENNAI_ORG_ID, latitude: coordinates.lat, longitude: coordinates.lng,
      operatingHours: { address, map, source, pin, simulatedOperations: true, weekdays: "06:00-22:00" }
    })) })
    await tx.bay.createMany({ data: chennaiWorkshops.flatMap((depot) =>
      Array.from({ length: depot.totalBays }, (_, i) => ({
        id: `${depot.id}-bay-${i + 1}`, depotId: depot.id, name: `Bay ${i + 1}`
      }))
    ) })
    await tx.part.createMany({ data: chennaiParts })
    await tx.inventoryItem.createMany({ data: chennaiInventory(nearPartInStock) })
    await tx.technician.createMany({ data: chennaiTechnicians })

    const now = new Date()
    const frames = chennaiVehicles.map((_, index) => chennaiFrame(index, 0, 101, now))
    await tx.vehicle.createMany({ data: chennaiVehicles.map(({ coordinates: _, ...vehicle }, index) => ({
      ...vehicle, organizationId: CHENNAI_ORG_ID,
      latitude: frames[index].coordinates.lat, longitude: frames[index].coordinates.lng
    })) })
    await tx.vehicleSignal.createMany({ data: frames.map(({ signal }) => ({ ...signal, timestamp: now })) })
  })
  console.log(`Chennai scenario ready: ${chennaiVehicles.length} simulated trucks across ${chennaiWorkshops.length} workshops.`)
}
