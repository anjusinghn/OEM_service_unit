import type {
  DepotRecommendation,
  HealthScore,
  PriorityEntry as SharedPriorityEntry,
  VehicleSignalSnapshot
} from "@kaz/shared"

import { cacheDelete, cacheGetJson, cacheSetJson } from "../redis"

const SIGNAL_TTL_SECONDS = 60
const HEALTH_TTL_SECONDS = 60
const PRIORITY_TTL_SECONDS = 60
const MATCH_TTL_SECONDS = 120

const signalKey = (vehicleId: string) => `vehicle:signal:${vehicleId}`
const healthKey = (vehicleId: string) => `vehicle:health:${vehicleId}`
const priorityKey = (vehicleId: string) => `vehicle:priority:${vehicleId}`
const depotMatchKey = (vehicleId: string) => `vehicle:depot-match:${vehicleId}`

export const cacheRepository = {
  getVehicleSignal(vehicleId: string) {
    return cacheGetJson<VehicleSignalSnapshot>(signalKey(vehicleId))
  },

  setVehicleSignal(vehicleId: string, snapshot: VehicleSignalSnapshot) {
    return cacheSetJson(signalKey(vehicleId), snapshot, { ttlSeconds: SIGNAL_TTL_SECONDS })
  },

  getVehicleHealth(vehicleId: string) {
    return cacheGetJson<HealthScore>(healthKey(vehicleId))
  },

  setVehicleHealth(vehicleId: string, snapshot: HealthScore) {
    return cacheSetJson(healthKey(vehicleId), snapshot, { ttlSeconds: HEALTH_TTL_SECONDS })
  },

  getVehiclePriority(vehicleId: string) {
    return cacheGetJson<SharedPriorityEntry>(priorityKey(vehicleId))
  },

  setVehiclePriority(vehicleId: string, entry: SharedPriorityEntry) {
    return cacheSetJson(priorityKey(vehicleId), entry, { ttlSeconds: PRIORITY_TTL_SECONDS })
  },

  getVehicleDepotMatch(vehicleId: string) {
    return cacheGetJson<DepotRecommendation[]>(depotMatchKey(vehicleId))
  },

  setVehicleDepotMatch(vehicleId: string, recommendations: DepotRecommendation[]) {
    return cacheSetJson(depotMatchKey(vehicleId), recommendations, { ttlSeconds: MATCH_TTL_SECONDS })
  },

  async invalidateVehicle(vehicleId: string): Promise<void> {
    await Promise.all([
      cacheDelete(signalKey(vehicleId)),
      cacheDelete(healthKey(vehicleId)),
      cacheDelete(priorityKey(vehicleId)),
      cacheDelete(depotMatchKey(vehicleId))
    ])
  }
}
