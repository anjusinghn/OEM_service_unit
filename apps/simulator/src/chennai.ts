import { enqueueJob, prisma, queueNames } from "@kaz/db"
import { assertChennaiStorage, CHENNAI_FAULT_VEHICLE, CHENNAI_ORG_ID, CHENNAI_SCENARIO, CHENNAI_PARK_TICK, chennaiFrame, chennaiVehicles } from "@kaz/shared"

export function createChennaiSimulator(tickMs: number, seed: number) {
  assertChennaiStorage(process.env.DATABASE_URL, process.env.REDIS_URL)
  let tick = -1
  let epoch: number | undefined

  return async () => {
    if (epoch === undefined) {
      const org = await prisma.organization.findUniqueOrThrow({ where: { id: CHENNAI_ORG_ID } })
      epoch = org.createdAt.getTime()
    }
    const now = new Date()
    const nextTick = Math.floor((now.getTime() - epoch) / tickMs)
    if (nextTick <= tick) return

    const vehicles = await prisma.vehicle.findMany({
      where: { organizationId: CHENNAI_ORG_ID },
      include: {
        signals: { take: 1, orderBy: { timestamp: "desc" } },
        serviceRequests: { orderBy: { createdAt: "desc" }, select: { status: true, weakestSubsystem: true, completedAt: true } }
      }
    })
    const byId = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))
    await Promise.all(chennaiVehicles.map(async (fixture, index) => {
      const vehicle = byId.get(fixture.id)
      if (!vehicle) throw new Error(`Seeded Chennai vehicle missing: ${fixture.id}`)
      const latest = vehicle.signals[0]
      const completedAt = vehicle.serviceRequests.find((request) => request.weakestSubsystem === "cooling" && request.completedAt)?.completedAt
      const frame = chennaiFrame(index, nextTick, seed, now, {
        parked: vehicle.serviceRequests.some((request) => request.status === "IN_PROGRESS"),
        repaired: Boolean(completedAt),
        movingTick: completedAt && fixture.id === CHENNAI_FAULT_VEHICLE ? CHENNAI_PARK_TICK + Math.max(0, Math.floor((now.getTime() - completedAt.getTime()) / tickMs)) : undefined,
        previous: latest && { coordinates: { lat: vehicle.latitude, lng: vehicle.longitude }, mileage: latest.mileage }
      })
      await enqueueJob(queueNames.telemetryIngest, {
        vehicleId: fixture.id, snapshot: frame.signal, timestamp: frame.signal.timestamp,
        source: CHENNAI_SCENARIO, chennai: { coordinates: frame.coordinates, fault: frame.fault }
      })
    }))
    tick = nextTick
  }
}
