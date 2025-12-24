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

export const detectCrossSystemCorrelations = (
  state: DemoState,
  healthByVehicle: Record<string, HealthScore>
): PatternCorrelation[] => {
  const correlations: PatternCorrelation[] = []

  for (let leftIndex = 0; leftIndex < SUBSYSTEMS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < SUBSYSTEMS.length; rightIndex += 1) {
      const leftSubsystem = SUBSYSTEMS[leftIndex]
      const rightSubsystem = SUBSYSTEMS[rightIndex]
      const leftValues = state.vehicles.map((vehicle) => healthByVehicle[vehicle.id]?.subsystems[leftSubsystem] ?? 0)
      const rightValues = state.vehicles.map((vehicle) => healthByVehicle[vehicle.id]?.subsystems[rightSubsystem] ?? 0)
      const leftMean = average(leftValues)
      const rightMean = average(rightValues)
      const covariance = average(leftValues.map((value, index) => (value - leftMean) * (rightValues[index] - rightMean)))
      const leftVariance = average(leftValues.map((value) => (value - leftMean) ** 2))
      const rightVariance = average(rightValues.map((value) => (value - rightMean) ** 2))
      const denominator = Math.sqrt(leftVariance * rightVariance)
      const strength = denominator > 0 ? covariance / denominator : 0

      if (Math.abs(strength) < 0.35) continue

      correlations.push({
        factorA: leftSubsystem,
        factorB: rightSubsystem,
        correlationType: "cross_system",
        strength: round(strength, 2),
        description: `${leftSubsystem} and ${rightSubsystem} health move ${strength > 0 ? "together" : "in opposite directions"} across the fleet`
      })
    }
  }

  return correlations.sort((left, right) => Math.abs(right.strength) - Math.abs(left.strength))
}

export const detectDtcSequences = (state: DemoState): FailurePattern[] => {
  const groups = new Map<string, { vehicleIds: string[]; faults: VehicleFault[] }>()

  for (const vehicle of state.vehicles) {
    const faults = [...(state.faults[vehicle.id] ?? [])].sort(
      (left, right) => new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime()
    )
    if (!faults.length) continue
    const sequenceKey = faults.map((fault) => fault.dtcCode).join("->")
    const current = groups.get(sequenceKey) ?? { vehicleIds: [], faults }
    current.vehicleIds.push(vehicle.id)
    groups.set(sequenceKey, current)
  }

  const patterns = [...groups.entries()]
    .map(([sequenceKey, group], index) => {
      const steps: DtcSequenceStep[] = group.faults.map((fault, stepIndex) => ({
        dtcCode: fault.dtcCode,
        subsystem: fault.subsystem,
        severity: fault.severity,
        medianDaysFromStart: stepIndex * 7 + 3
      }))
      const supportCount = group.vehicleIds.length
      const supportRate = supportCount / Math.max(1, state.vehicles.length)
      const affectedSubsystems = [...new Set(group.faults.map((fault) => fault.subsystem))]
      const affectedRegions = [
        ...new Set(
          group.vehicleIds
            .map((vehicleId) => state.vehicles.find((vehicle) => vehicle.id === vehicleId)?.region)
            .filter((region): region is string => Boolean(region))
        )
      ]

      return {
        id: createId("pattern", index + 1),
        name: steps.map((step) => step.dtcCode).join(" -> "),
        type: "dtc_sequence" as const,
        status: "DETECTED" as const,
        confidence: round(clamp(0.42 + supportRate * 1.8 + affectedSubsystems.length * 0.05, 0.4, 0.96), 2),
        supportCount,
        totalVehicles: state.vehicles.length,
        supportRate: round(supportRate, 2),
        sequence: steps,
        affectedSubsystems,
        affectedRegions,
        correlations: [],
        detectedAt: nowIso(),
        summary: `${sequenceKey.replace(/->/g, " -> ")} chain appears in ${round(supportRate * 100, 0)}% of flagged vehicles`
      }
    })
    .filter((pattern) => pattern.supportCount >= 2)

  return patterns.sort((left, right) => right.confidence - left.confidence || right.supportCount - left.supportCount)
}

export const buildGeographicHeatmap = (state: DemoState): GeographicHeatmapPoint[] => {
  const grouped = new Map<string, GeographicHeatmapPoint>()

  for (const vehicle of state.vehicles) {
    const faults = state.faults[vehicle.id] ?? []
    if (!faults.length) continue
    const primaryFault = faults.sort((left, right) => severityRank(right.severity) - severityRank(left.severity))[0]
    const key = `${vehicle.region}:${primaryFault.dtcCode}`
    const existing = grouped.get(key)

    if (existing) {
      existing.vehicleCount += 1
      existing.intensity = round(existing.intensity + faults.length * 0.4, 1)
      continue
    }

    grouped.set(key, {
      lat: vehicle.coordinates.lat,
      lng: vehicle.coordinates.lng,
      intensity: round(1 + faults.length * 0.8, 1),
      dtcCode: primaryFault.dtcCode,
      vehicleCount: 1,
      region: vehicle.region
    })
  }

  return [...grouped.values()].sort((left, right) => right.intensity - left.intensity)
}

export const createInvestigation = (
  anomaly: CohortAnomaly | null,
  pattern: FailurePattern | null,
  affectedVehicleIds: string[]
): Investigation => {
  const createdAt = nowIso()
  const title = anomaly
    ? `Investigate ${anomaly.cohortName}`
    : pattern
      ? `Investigate ${pattern.name}`
      : "Investigate fleet anomaly"

  return {
    id: createId("inv", Math.max(1, affectedVehicleIds.length)),
    patternId: pattern?.id ?? null,
    anomalyId: anomaly?.id ?? null,
    title,
    status: "INVESTIGATION_OPENED",
    rootCause: null,
    affectedVehicleIds,
    affectedVehicleCount: affectedVehicleIds.length,
    containment: null,
    timeline: [{ status: "INVESTIGATION_OPENED", at: createdAt, note: `${title} opened for evidence collection.` }],
    createdAt,
    updatedAt: createdAt
  }
}

export const advanceInvestigation = (
  investigation: Investigation,
  status?: InvestigationStatus,
  note?: string
): Investigation => {
  const currentIndex = INVESTIGATION_FLOW.indexOf(investigation.status)
  const nextStatus = status ?? INVESTIGATION_FLOW[Math.min(currentIndex + 1, INVESTIGATION_FLOW.length - 1)]
  const at = nowIso()

  return {
    ...investigation,
    status: nextStatus,
    updatedAt: at,
    timeline: [
      ...investigation.timeline,
      {
        status: nextStatus,
        at,
        note: note ?? `Investigation moved to ${nextStatus.toLowerCase().replace(/_/g, " ")}.`
      }
    ]
  }
}

const buildSignalComparisons = (affectedVehicleIds: string[], state: DemoState): SignalComparison[] => {
  const affectedSignals = affectedVehicleIds.map((vehicleId) => state.signals[vehicleId]).filter(Boolean)
  const baselineSignals = state.vehicles.map((vehicle) => state.signals[vehicle.id]).filter(Boolean)

  return signalKeys.map((signalName) => {
    const affectedAvg = average(affectedSignals.map((signal) => Number(signal[signalName] ?? 0)))
    const baselineAvg = average(baselineSignals.map((signal) => Number(signal[signalName] ?? 0)))
    return {
      signalName,
      affectedAvg: round(affectedAvg, 2),
      baselineAvg: round(baselineAvg, 2),
      deviation: round(affectedAvg - baselineAvg, 2),
      unit: signalUnits[signalName]
    }
  })
}

const buildSupplierEvidence = (state: DemoState): SupplierEvidence[] => {
  const totalFaultCount = Object.values(state.faults).flat().length
  const baselineFaultRate = totalFaultCount / Math.max(1, state.vehicles.length)

  return state.suppliers.flatMap((supplier) =>
    supplier.componentTypes.map((componentType, index) => {
      const supplierFaultCount = Object.values(state.faults)
        .flat()
        .filter((fault) => {
          if (componentType.includes("turbo")) return fault.subsystem === "turbo"
          if (componentType.includes("exhaust")) return fault.subsystem === "exhaust"
          if (componentType.includes("coolant")) return fault.subsystem === "cooling"
          if (componentType.includes("brake")) return fault.subsystem === "brakes"
          if (componentType.includes("fuel")) return fault.subsystem === "fuel"
          if (componentType.includes("transmission")) return fault.subsystem === "transmission"
          return fault.subsystem === "electrical"
        }).length
      const faultRate = supplierFaultCount / Math.max(1, state.vehicles.length)
      const rateRatio = baselineFaultRate > 0 ? faultRate / baselineFaultRate : 1

      return {
        supplierName: supplier.name,
        componentType,
        batchId: supplier.activeBatches[index % supplier.activeBatches.length],
        faultRate: round(faultRate, 3),
        baselineFaultRate: round(baselineFaultRate, 3),
        rateRatio: round(rateRatio, 2)
      }
    })
  )
}

export const buildEvidencePackage = (
  investigation: Investigation,
  state: DemoState,
  healthByVehicle: Record<string, HealthScore>
): EvidencePackage => {
  const affectedVehicleIds = investigation.affectedVehicleIds
  const signalComparisons = buildSignalComparisons(affectedVehicleIds, state)
  const dtcHistory = affectedVehicleIds.flatMap((vehicleId) =>
    (state.faults[vehicleId] ?? []).map((fault) => ({
      vehicleId,
      dtcCode: fault.dtcCode,
      occurredAt: fault.occurredAt,
      severity: fault.severity
    }))
  )
  const serviceHistory = state.serviceHistory
    .filter((record) => affectedVehicleIds.includes(record.vehicleId))
    .map((record) => ({
      vehicleId: record.vehicleId,
      subsystem: record.subsystem,
      outcome: record.outcome,
      resolvedAt: record.resolvedAt
    }))
  const cohorts = buildCohorts(state).filter((cohort) => cohort.vehicleIds.some((vehicleId) => affectedVehicleIds.includes(vehicleId)))
  const cohortContext = cohorts.slice(0, 4).map((cohort) => ({
    dimension: cohort.dimension,
    value: cohort.dimensionValue,
    faultRate: round(faultRateForVehicleIds(cohort.vehicleIds, state.faults), 3),
    baselineRate: round(faultRateForVehicleIds(state.vehicles.map((vehicle) => vehicle.id), state.faults), 3)
  }))
  const supplierContext = buildSupplierEvidence(state).slice(0, 6)
  const environmentalRegions = [
    ...new Set(
      affectedVehicleIds
        .map((vehicleId) => vehicleMap(state).get(vehicleId)?.region)
        .filter((region): region is string => Boolean(region))
    )
  ]
  const environmentalContext = environmentalRegions.map((region) => ({
      region,
      faultRate: round(
        faultRateForVehicleIds(
          state.vehicles.filter((vehicle) => vehicle.region === region).map((vehicle) => vehicle.id),
          state.faults
        ),
        3
      )
    }))

  void healthByVehicle

  return {
    investigationId: investigation.id,
    affectedVehicleIds,
    signalComparisons,
    dtcHistory,
    serviceHistory,
    cohortContext,
    supplierContext,
    environmentalContext
  }
}

export const recommendContainment = (
