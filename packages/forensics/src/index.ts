import { computeHealthScore } from "@kaz/signal-trust"
import {
  COHORT_DIMENSIONS,
  CONTAINMENT_TYPES,
  INVESTIGATION_FLOW,
  SUBSYSTEMS,
  average,
  clamp,
  createId,
  nowIso,
  round,
  type Cohort,
  type CohortAnomaly,
  type CohortComparison,
  type CohortDimension,
  type CohortFaultProfile,
  type ContainmentRecommendation,
  type DemoState,
  type DtcSequenceStep,
  type EvidencePackage,
  type FailurePattern,
  type ForensicsSnapshot,
  type GeographicHeatmapPoint,
  type HealthScore,
  type Investigation,
  type InvestigationStatus,
  type PatternCorrelation,
  type ServiceHistoryRecord,
  type SignalComparison,
  type SubsystemKey,
  type SupplierBatchScore,
  type SupplierEvidence,
  type SupplierInfo,
  type SupplierScorecard,
  type Vehicle,
  type VehicleFault,
  type VehicleSignalSnapshot
} from "@kaz/shared"

const signalUnits: Record<keyof Omit<VehicleSignalSnapshot, "vehicleId" | "timestamp">, string> = {
  coolantTemp: "C",
  oilPressure: "kPa",
  batteryVoltage: "V",
  turboBoost: "bar",
  brakeWear: "%",
  exhaustTemp: "C",
  fuelLevel: "%",
  speed: "km/h",
  mileage: "km"
}

const signalKeys = Object.keys(signalUnits) as Array<keyof typeof signalUnits>

const severityRank = (severity: VehicleFault["severity"]) => {
  if (severity === "safety") return 4
  if (severity === "critical") return 3
  if (severity === "warning") return 2
  return 1
}

const anomalySeverityRank = (severity: CohortAnomaly["severity"]) => {
  if (severity === "critical") return 4
  if (severity === "high") return 3
  if (severity === "medium") return 2
  return 1
}

const buildDutyCycle = (vehicle: Vehicle) => {
  if (vehicle.routeCriticality >= 78) return "highway"
  if (vehicle.nextStopHours <= 5) return "urban"
  return "mixed"
}

const cohortValueForVehicle = (vehicle: Vehicle, dimension: CohortDimension) => {
  switch (dimension) {
    case "buildBatch":
      return vehicle.buildBatch
    case "softwareVersion":
      return vehicle.softwareVersion
    case "region":
      return vehicle.region
    case "model":
      return vehicle.model
    case "dutyCycle":
      return buildDutyCycle(vehicle)
    case "depot":
      return vehicle.depotAffinityId
  }
}

const vehicleMap = (state: DemoState) => new Map(state.vehicles.map((vehicle) => [vehicle.id, vehicle]))

const healthMapFromState = (state: DemoState) =>
  Object.fromEntries(
    state.vehicles.map((vehicle) => [
      vehicle.id,
      computeHealthScore(state.signals[vehicle.id], state.faults[vehicle.id] ?? [])
    ])
  ) as Record<string, HealthScore>

const faultRateForVehicleIds = (vehicleIds: string[], faultsByVehicle: DemoState["faults"]) => {
  if (!vehicleIds.length) return 0
  const totalFaults = vehicleIds.reduce((sum, vehicleId) => sum + (faultsByVehicle[vehicleId]?.length ?? 0), 0)
  return totalFaults / vehicleIds.length
}

const chiSquaredApprox = (observed: number, expected: number, total: number) => {
  if (expected <= 0 || total <= 0) return 1
  const chi = ((observed - expected) ** 2) / expected
  return round(Math.exp(-0.5 * chi) / Math.sqrt(Math.max(1, total)), 4)
}

const dedupeSubsystems = (faults: VehicleFault[]) => [...new Set(faults.map((fault) => fault.subsystem))]

const buildFaultProfilesForVehicleIds = (
  cohortId: string,
  vehicleIds: string[],
  state: DemoState
): CohortFaultProfile[] => {
  const baselineVehicleCount = Math.max(1, state.vehicles.length)
  const baselineFaults = Object.values(state.faults).flat()
  const cohortFaults = vehicleIds.flatMap((vehicleId) => state.faults[vehicleId] ?? [])
  const faultGroups = new Map<string, VehicleFault[]>()

  for (const fault of cohortFaults) {
    const list = faultGroups.get(fault.dtcCode) ?? []
    list.push(fault)
    faultGroups.set(fault.dtcCode, list)
  }

  return [...faultGroups.entries()]
    .map(([dtcCode, faults]) => {
      const subsystem = faults[0]?.subsystem ?? "engine"
      const faultCount = faults.length
      const faultRate = faultCount / Math.max(1, vehicleIds.length)
      const baselineCount = baselineFaults.filter((fault) => fault.dtcCode === dtcCode).length
      const baselineFaultRate = baselineCount / baselineVehicleCount
      const rateRatio = baselineFaultRate > 0 ? faultRate / baselineFaultRate : faultRate > 0 ? 4 : 1
      const mtbfDays = round(clamp(120 - faultCount * 7 - rateRatio * 9, 8, 120), 1)

      return {
        cohortId,
