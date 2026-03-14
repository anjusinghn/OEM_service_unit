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
  type TechnicianRecommendation,
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

      return {
        depotId: depot.id,
        score,
        etaHours: round(distance / 38, 1),
        distanceKm: distance,
        capacityOpen,
        specialtyMatch,
        partsReady,
        reasons,
        requiredParts
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export const recommendTechnicians = (
  state: DemoState,
  depotId: string,
  weakestSubsystem: SubsystemKey
): TechnicianRecommendation[] => {
  return state.technicians
    .filter((technician) => technician.depotId === depotId)
    .map((technician) => {
      const skillMatch = technician.certifications.includes(weakestSubsystem)
      const capacity = technician.maxLoad - technician.currentLoad
      const score = round((skillMatch ? 44 : 12) + technician.firstTimeFixRate * 34 + capacity * 6, 1)
      return {
        technicianId: technician.id,
        score,
        reasons: [
          skillMatch ? `certified in ${weakestSubsystem}` : `adjacent skill coverage`,
          `${capacity}/${technician.maxLoad} workload slots open`,
          `${round(technician.firstTimeFixRate * 100, 0)}% first-time-fix rate`
        ]
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export const buildOverview = (state: DemoState, healthByVehicle: Record<string, HealthScore>): FleetOverview => {
  const healthValues = Object.values(healthByVehicle)
  const healthyVehicles = healthValues.filter((item) => item.status === "healthy").length
  const watchVehicles = healthValues.filter((item) => item.status === "watch").length
  const criticalVehicles = healthValues.filter((item) => item.status === "critical").length
  const openServiceRequests = state.serviceRequests.filter((request) => request.status !== "CLOSED").length
  const avgTurnaroundHours = round(7.5 + openServiceRequests * 0.35, 1)
  const firstTimeFixRate = round(
    average(state.serviceHistory.map((record) => (record.firstTimeFix ? 100 : 0))),
    1
  )
  const bayUtilization = round(
    average(state.depots.map((depot) => (depot.occupiedBays / depot.totalBays) * 100)),
    1
  )

  return {
    totalVehicles: state.vehicles.length,
    healthyVehicles,
    watchVehicles,
    criticalVehicles,
    openServiceRequests,
    avgTurnaroundHours,
    firstTimeFixRate,
    bayUtilization
  }
}

export const buildSnapshot = (
  state: DemoState,
  healthByVehicle: Record<string, HealthScore>,
  alerts: DashboardSnapshot["alerts"]
): DashboardSnapshot => {
  const priorityQueue = buildPriorityQueue(state, healthByVehicle)
  const depotRecommendations = Object.fromEntries(
    priorityQueue.slice(0, 16).map((entry) => {
      const vehicle = state.vehicles.find((item) => item.id === entry.vehicleId)!
      return [vehicle.id, recommendDepots(vehicle, state, healthByVehicle[vehicle.id].weakestSubsystem)]
    })
  )
  const technicianRecommendations = Object.fromEntries(
    Object.entries(depotRecommendations).map(([vehicleId, depots]) => {
      const bestDepot = depots[0]
      const weakestSubsystem = healthByVehicle[vehicleId].weakestSubsystem
      return [vehicleId, recommendTechnicians(state, bestDepot.depotId, weakestSubsystem)]
    })
  )

  return {
    overview: buildOverview(state, healthByVehicle),
    healthByVehicle,
    alerts,
    priorityQueue,
    depotRecommendations,
    technicianRecommendations,
    livePulse: state.livePulse
  }
}

export const createServiceRequest = (
  state: DemoState,
  vehicleId: string,
  priorityScore: number,
  weakestSubsystem: SubsystemKey,
  depotId: string,
  technicianId: string,
  requiredPartNumbers: string[]
): ServiceRequest => {
  const createdAt = new Date().toISOString()
  return {
    id: createId("req", state.serviceRequests.length + 1),
    vehicleId,
    priorityScore,
    weakestSubsystem,
    depotId,
    technicianId,
    requiredPartNumbers,
    status: "DEPOT_ASSIGNED",
    createdAt,
    scheduledFor: null,
    timeline: [
      { status: "DETECTED", at: createdAt, note: "Signal Trust flagged the vehicle for intervention." },
      { status: "PRIORITIZED", at: createdAt, note: `Vehicle ranked at priority score ${priorityScore}.` },
      { status: "DEPOT_ASSIGNED", at: createdAt, note: `Assigned to depot ${depotId}.` }
    ]
  }
}

export const getNextServiceStatus = (status: ServiceRequestStatus): ServiceRequestStatus => {
  const currentIndex = SERVICE_FLOW.indexOf(status)
  return SERVICE_FLOW[Math.min(currentIndex + 1, SERVICE_FLOW.length - 1)]
}
