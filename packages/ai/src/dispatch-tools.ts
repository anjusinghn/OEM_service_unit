import { tool } from "@langchain/core/tools"
import { z } from "zod"

import type { DepotRecommendation, HealthScore, ServiceHistoryRecord, Vehicle, VehicleFault } from "@kaz/shared"

export type DispatchToolContext = {
  vehicle: Vehicle
  health: HealthScore
  faults: VehicleFault[]
  depotRecommendations: DepotRecommendation[]
  serviceHistory: ServiceHistoryRecord[]
  partsToStage: string[]
}

export const createDispatchTools = (context: DispatchToolContext) => {
  const emptySchema = z.object({})

  return [
    tool(async () => JSON.stringify({ vehicle: context.vehicle, health: context.health, faults: context.faults }), {
      name: "vehicle_lookup",
      description: "Return vehicle, health, and active faults for dispatch planning.",
      schema: emptySchema
    }),
    tool(async () => JSON.stringify(context.depotRecommendations), {
      name: "depot_lookup",
      description: "Return depot recommendation candidates with scores and reasons.",
      schema: emptySchema
    }),
    tool(async () => JSON.stringify({ partsToStage: context.partsToStage, depotRecommendation: context.depotRecommendations[0] ?? null }), {
      name: "parts_check",
      description: "Return staged parts and current depot readiness.",
      schema: emptySchema
    }),
    tool(async () => JSON.stringify(context.serviceHistory.slice(0, 10)), {
      name: "service_history",
      description: "Return recent service history relevant to the vehicle.",
      schema: emptySchema
    }),
    tool(async () => JSON.stringify({ routeCriticality: context.vehicle.routeCriticality, downtimeCostPerHour: context.vehicle.downtimeCostPerHour }), {
      name: "fleet_stats",
      description: "Return condensed fleet and route criticality context.",
      schema: emptySchema
    }),
    tool(async () => JSON.stringify(context.serviceHistory.filter((record) => record.subsystem === context.health.weakestSubsystem).slice(0, 5)), {
      name: "similar_cases",
      description: "Return recent similar service cases by subsystem.",
      schema: emptySchema
    })
  ]
}
