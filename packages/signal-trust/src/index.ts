import { SUBSYSTEMS, clamp, round, type Alert, type HealthScore, type SubsystemKey, type VehicleFault, type VehicleSignalSnapshot } from "@kaz/shared"

const scoreSignalQuality = (snapshot: VehicleSignalSnapshot) => {
  const values = [
    snapshot.coolantTemp,
    snapshot.oilPressure,
    snapshot.batteryVoltage,
    snapshot.turboBoost,
    snapshot.brakeWear,
    snapshot.exhaustTemp,
    snapshot.fuelLevel,
    snapshot.speed
  ]
  const invalids = values.filter((value) => Number.isNaN(value) || !Number.isFinite(value)).length
  return round(clamp(100 - invalids * 12, 76, 99), 1)
}

const applyFaultPenalty = (base: number, faults: VehicleFault[], subsystem: SubsystemKey) => {
  return faults
    .filter((fault) => fault.subsystem === subsystem)
    .reduce((score, fault) => {
      const penalty = fault.severity === "safety" ? 30 : fault.severity === "critical" ? 26 : fault.severity === "warning" ? 18 : 8
      return score - penalty
    }, base)
}

export const computeHealthScore = (snapshot: VehicleSignalSnapshot, faults: VehicleFault[]): HealthScore => {
  const subsystems = {
    engine: clamp(100 - Math.max(0, snapshot.coolantTemp - 94) * 1.8 - Math.max(0, 38 - snapshot.oilPressure) * 1.5, 12, 99),
    cooling: clamp(100 - Math.max(0, snapshot.coolantTemp - 92) * 2.3, 10, 99),
    brakes: clamp(100 - Math.max(0, snapshot.brakeWear - 38) * 1.3, 8, 99),
    electrical: clamp(100 - Math.max(0, 12.7 - snapshot.batteryVoltage) * 31, 12, 99),
    exhaust: clamp(100 - Math.max(0, snapshot.exhaustTemp - 420) * 0.24, 10, 99),
    turbo: clamp(100 - Math.max(0, 1.45 - snapshot.turboBoost) * 54, 8, 99),
    fuel: clamp(100 - Math.max(0, 22 - snapshot.fuelLevel) * 0.8, 28, 99),
    transmission: clamp(100 - Math.max(0, snapshot.speed < 20 ? 4 : 0) * 2, 35, 99)
  } satisfies Record<SubsystemKey, number>

  for (const subsystem of SUBSYSTEMS) {
    subsystems[subsystem] = clamp(applyFaultPenalty(subsystems[subsystem], faults, subsystem), 5, 99)
  }

  const weakestSubsystem = SUBSYSTEMS.reduce((weakest, current) => (subsystems[current] < subsystems[weakest] ? current : weakest), "engine")
  const overall = round(SUBSYSTEMS.reduce((sum, subsystem) => sum + subsystems[subsystem], 0) / SUBSYSTEMS.length, 1)
  const signalQuality = scoreSignalQuality(snapshot)
  const status = overall < 55 ? "critical" : overall < 78 ? "watch" : "healthy"
  const trend = overall < 60 || faults.length > 0 ? "degrading" : overall > 88 ? "improving" : "stable"

  return {
    overall,
    signalQuality,
    trend,
    status,
    weakestSubsystem,
    subsystems: Object.fromEntries(SUBSYSTEMS.map((subsystem) => [subsystem, round(subsystems[subsystem], 1)])) as Record<SubsystemKey, number>
  }
}

export const dedupeAlerts = (faultsByVehicle: Record<string, VehicleFault[]>): Alert[] => {
  return Object.values(faultsByVehicle)
    .flat()
    .map((fault) => ({
      id: fault.id,
      vehicleId: fault.vehicleId,
      severity: fault.severity,
      title: fault.title,
      subsystem: fault.subsystem,
      occurredAt: fault.occurredAt,
      count: fault.occurrences
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
}
