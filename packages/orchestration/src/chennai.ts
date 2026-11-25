import {
  CHENNAI_COOLING_PART, chennaiWorkshops, distanceKm, round,
  type DemoState, type DepotRecommendation, type SubsystemKey, type Vehicle
} from "@kaz/shared"

export const isChennaiVehicle = (vehicle: Vehicle) => vehicle.buildBatch === "CHENNAI-SIM"

export function recommendChennaiDepots(vehicle: Vehicle, state: DemoState, subsystem: SubsystemKey): DepotRecommendation[] {
  const requiredParts = state.parts.filter((part) => part.subsystem === subsystem &&
    (subsystem !== "cooling" || part.partNumber === CHENNAI_COOLING_PART))
  if (!requiredParts.length) return []

  return state.depots.flatMap((depot) => {
    const workshop = chennaiWorkshops.find((item) => item.id === depot.id)
    if (!workshop || !depot.specialties.includes(subsystem)) return []
    const capacityOpen = depot.totalBays - depot.occupiedBays
    if (capacityOpen <= 0) return []
    const technician = state.technicians
      .filter((item) => item.depotId === depot.id && item.certifications.includes(subsystem) && item.currentLoad < item.maxLoad)
      .sort((a, b) => a.currentLoad - b.currentLoad || a.id.localeCompare(b.id))[0]
    if (!technician) return []

    // Estimate road distance from the current route waypoint using a fixed detour factor.
    const distance = round(distanceKm(vehicle.coordinates, depot.coordinates) * 1.25, 1)
    if (distance > 45) return []

    const travelMinutes = Math.ceil(distance / 35 * 60)
    const missingParts = requiredParts.filter((part) =>
      !state.inventory.some((item) => item.depotId === depot.id && item.partNumber === part.partNumber && item.quantity > 0))
    const knownReplenishment = depot.id === "chennai-poonamallee" &&
      missingParts.every((part) => part.partNumber === CHENNAI_COOLING_PART)
    if (missingParts.length && !knownReplenishment) return []
    const partsReadyMinutes = missingParts.length ? 90 : 0
    const bayReadyMinutes = 0
    const technicianReadyMinutes = 0
    const repairMinutes = subsystem === "cooling" ? 75 : 90
    const returnToServiceMinutes = Math.max(travelMinutes, partsReadyMinutes, bayReadyMinutes, technicianReadyMinutes) + repairMinutes

    return [{
      depotId: depot.id, score: round(100 / (1 + returnToServiceMinutes / 60), 1),
      etaHours: round(travelMinutes / 60, 2), distanceKm: distance, capacityOpen,
      specialtyMatch: true, partsReady: missingParts.length === 0, requiredParts,
      reasons: [
        `${depot.name} · estimated ${distance} km / ${travelMinutes} min travel`,
        partsReadyMinutes ? `Required part expected in ${partsReadyMinutes} min` : "Required parts available now",
        `Bay and qualified technician available; estimated ${repairMinutes} min repair`,
        `Estimated return to service in ${returnToServiceMinutes} min`
      ],
      schedule: { technicianId: technician.id, travelMinutes, partsReadyMinutes, bayReadyMinutes, technicianReadyMinutes, repairMinutes, returnToServiceMinutes }
    }]
  }).sort((a, b) => a.schedule.returnToServiceMinutes - b.schedule.returnToServiceMinutes || a.depotId.localeCompare(b.depotId))
}
