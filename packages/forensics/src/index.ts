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
        dtcCode,
        subsystem,
        faultCount,
        faultRate: round(faultRate, 3),
        baselineFaultRate: round(baselineFaultRate, 3),
        rateRatio: round(rateRatio, 2),
        mtbfDays
      }
    })
    .sort((left, right) => right.rateRatio - left.rateRatio || right.faultCount - left.faultCount)
}

const deriveAnomalySeverity = (rateRatio: number, pValue: number): CohortAnomaly["severity"] => {
  if (rateRatio >= 3.2 && pValue <= 0.01) return "critical"
  if (rateRatio >= 2.4 && pValue <= 0.03) return "high"
  if (rateRatio >= 1.8) return "medium"
  return "low"
}

const strongestFaultsForVehicles = (vehicleIds: string[], state: DemoState) => {
  const faults = vehicleIds.flatMap((vehicleId) => state.faults[vehicleId] ?? [])
  const grouped = new Map<string, VehicleFault[]>()

  for (const fault of faults) {
    const key = `${fault.dtcCode}:${fault.subsystem}`
    const list = grouped.get(key) ?? []
    list.push(fault)
    grouped.set(key, list)
  }

  return [...grouped.entries()]
    .map(([, group]) => group)
    .sort((left, right) => {
      const leftScore = left.length * 10 + severityRank(left[0]?.severity ?? "info")
      const rightScore = right.length * 10 + severityRank(right[0]?.severity ?? "info")
      return rightScore - leftScore
    })
}

export const buildCohorts = (state: DemoState): Cohort[] => {
  const builtAt = nowIso()
  const cohorts: Cohort[] = []

  for (const dimension of COHORT_DIMENSIONS) {
    const groups = new Map<string, string[]>()

    for (const vehicle of state.vehicles) {
      const value = cohortValueForVehicle(vehicle, dimension)
      const vehicleIds = groups.get(value) ?? []
      vehicleIds.push(vehicle.id)
      groups.set(value, vehicleIds)
    }

    for (const [dimensionValue, vehicleIds] of groups.entries()) {
      cohorts.push({
        id: createId(`cohort-${dimension}`, cohorts.length + 1),
        name: `${dimension} · ${dimensionValue}`,
        dimension,
        dimensionValue,
        vehicleIds,
        vehicleCount: vehicleIds.length,
        createdAt: builtAt
      })
    }
  }

  return cohorts.sort((left, right) => right.vehicleCount - left.vehicleCount || left.name.localeCompare(right.name))
}

export const computeCohortFaultProfile = (cohort: Cohort, state: DemoState): CohortFaultProfile[] =>
  buildFaultProfilesForVehicleIds(cohort.id, cohort.vehicleIds, state)

export const compareCohort = (
  cohort: Cohort,
  state: DemoState,
  healthByVehicle: Record<string, HealthScore>
): CohortComparison => {
  const faultProfiles = computeCohortFaultProfile(cohort, state)
  const overallFaultRate = faultRateForVehicleIds(cohort.vehicleIds, state.faults)
  const baselineOverallFaultRate = faultRateForVehicleIds(
    state.vehicles.map((vehicle) => vehicle.id),
    state.faults
  )
  const avgHealthScore = average(cohort.vehicleIds.map((vehicleId) => healthByVehicle[vehicleId]?.overall ?? 0))
  const baselineAvgHealthScore = average(state.vehicles.map((vehicle) => healthByVehicle[vehicle.id]?.overall ?? 0))
  const expectedFaults = baselineOverallFaultRate * Math.max(1, cohort.vehicleCount)
  const observedFaults = cohort.vehicleIds.reduce((sum, vehicleId) => sum + (state.faults[vehicleId]?.length ?? 0), 0)
  const statisticalSignificance = chiSquaredApprox(observedFaults, Math.max(0.5, expectedFaults), cohort.vehicleCount)

  return {
    cohortId: cohort.id,
    cohortName: cohort.name,
    baselineLabel: "Fleet baseline",
    faultProfiles,
    overallFaultRate: round(overallFaultRate, 3),
    baselineOverallFaultRate: round(baselineOverallFaultRate, 3),
    avgHealthScore: round(avgHealthScore, 1),
    baselineAvgHealthScore: round(baselineAvgHealthScore, 1),
    statisticalSignificance,
    isSignificant: statisticalSignificance < 0.05,
    sampleSize: cohort.vehicleCount
  }
}

export const detectAnomalousCohorts = (
  state: DemoState,
  healthByVehicle: Record<string, HealthScore>
): CohortAnomaly[] => {
  const cohorts = buildCohorts(state)
  const anomalies: CohortAnomaly[] = []

  for (const cohort of cohorts) {
    if (cohort.vehicleCount < 4) continue
    const comparison = compareCohort(cohort, state, healthByVehicle)
    const faultProfile = comparison.faultProfiles[0]
    if (!faultProfile || faultProfile.rateRatio <= 2 || !comparison.isSignificant) continue

    const pValue = comparison.statisticalSignificance
    const severity = deriveAnomalySeverity(faultProfile.rateRatio, pValue)
    const pDisplay = pValue < 0.001 ? "< 0.001" : `= ${pValue}`

    anomalies.push({
      id: createId("anomaly", anomalies.length + 1),
      cohortId: cohort.id,
      cohortName: cohort.name,
      dimension: cohort.dimension,
      dimensionValue: cohort.dimensionValue,
      anomalyType: "fault_rate_spike",
      dtcCode: faultProfile.dtcCode,
      subsystem: faultProfile.subsystem,
      rateRatio: round(faultProfile.rateRatio, 2),
      pValue,
      affectedVehicleCount: cohort.vehicleCount,
      severity,
      detectedAt: nowIso(),
      summary: `${cohort.dimensionValue} has ${round(faultProfile.rateRatio, 1)}x more ${faultProfile.dtcCode} faults than fleet average (p ${pDisplay}, n=${cohort.vehicleCount} vehicles)`
    })
  }

  return anomalies.sort((left, right) => anomalySeverityRank(right.severity) - anomalySeverityRank(left.severity) || right.rateRatio - left.rateRatio)
}

