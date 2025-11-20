import {
  PARTS_BY_SUBSYSTEM,
  SERVICE_FLOW,
  average,
  clamp,
  createId,
  distanceKm,
  round,
  type DashboardSnapshot,
  type DemoState,
  type DepotRecommendation,
  type FleetOverview,
  type HealthScore,
  type Part,
  type PriorityBreakdown,
  type PriorityEntry,
  type ServiceRequest,
  type ServiceRequestStatus,
  type SubsystemKey,
  type Vehicle
} from "@kaz/shared"

const severityWeight = (health: HealthScore) => (health.status === "critical" ? 100 : health.status === "watch" ? 65 : 24)

const requiredPartsForSubsystem = (parts: Part[], subsystem: SubsystemKey) => {
  const candidatePartNumbers = new Set(PARTS_BY_SUBSYSTEM[subsystem].map((part) => part.partNumber))
  return parts.filter((part) => candidatePartNumbers.has(part.partNumber))
}

export const buildPriorityQueue = (
  state: DemoState,
  healthByVehicle: Record<string, HealthScore>
): PriorityEntry[] => {
  return state.vehicles
    .map((vehicle) => {
      const health = healthByVehicle[vehicle.id]
      const breakdown: PriorityBreakdown = {
        safetyUrgency: round(Math.max(0, 100 - health.subsystems.brakes) * 0.8 + (health.status === "critical" ? 20 : 0), 1),
        failureProximity: round(100 - health.overall + (health.trend === "degrading" ? 18 : 4), 1),
        businessImpact: round((vehicle.routeCriticality * 0.58) + (vehicle.cargoPriority * 0.42), 1),
        downtimeCost: round(clamp(vehicle.downtimeCostPerHour / 28, 10, 100), 1),
        serviceWindow: round(clamp(100 - vehicle.nextStopHours * 5.2, 8, 100), 1),
        reasons: []
      }

      breakdown.reasons.push(
        `${health.weakestSubsystem} is trending ${health.trend}`,
        `route criticality ${vehicle.routeCriticality}/100`,
        `next serviceable stop in ${round(vehicle.nextStopHours, 1)}h`
      )

      const score = round(
        breakdown.safetyUrgency * 0.3 +
          breakdown.failureProximity * 0.25 +
          breakdown.businessImpact * 0.2 +
          breakdown.downtimeCost * 0.15 +
          breakdown.serviceWindow * 0.1 +
          severityWeight(health) * 0.12,
        1
      )

      return {
        vehicleId: vehicle.id,
        score,
        status: health.status,
        breakdown
      }
    })
    .sort((a, b) => b.score - a.score)
}

export const recommendDepots = (
  vehicle: Vehicle,
  state: DemoState,
  weakestSubsystem: SubsystemKey
): DepotRecommendation[] => {
  const requiredParts = requiredPartsForSubsystem(state.parts, weakestSubsystem)

  return state.depots
    .map((depot) => {
      const distance = distanceKm(vehicle.coordinates, depot.coordinates)
      const capacityOpen = depot.totalBays - depot.occupiedBays
      const specialtyMatch = depot.specialties.includes(weakestSubsystem)
      const partsReady = requiredParts.every((part) => {
        const inventory = state.inventory.find((item) => item.depotId === depot.id && item.partNumber === part.partNumber)
        return (inventory?.quantity ?? 0) > 0
      })

      const score = round(
        (specialtyMatch ? 35 : 10) +
          (partsReady ? 30 : 6) +
          clamp(capacityOpen * 7, 4, 28) -
          clamp(distance * 0.45, 0, 30),
        1
      )

      const reasons = [
        specialtyMatch ? `has ${weakestSubsystem} capability` : `requires cross-trained support for ${weakestSubsystem}`,
        partsReady ? "all priority parts are in stock" : "one or more parts need transfer",
        `${capacityOpen}/${depot.totalBays} bays open`,
        `${distance} km from vehicle`]
