export type DtcSeverity = "info" | "warning" | "critical" | "safety"
export type TrendDirection = "improving" | "stable" | "degrading"
export type FleetStatus = "healthy" | "watch" | "critical"

export type SubsystemKey =
  | "engine"
  | "cooling"
  | "brakes"
  | "electrical"
  | "exhaust"
  | "turbo"
  | "fuel"
  | "transmission"

export type ServiceRequestStatus =
  | "DETECTED"
  | "PRIORITIZED"
  | "DEPOT_ASSIGNED"
  | "PARTS_CONFIRMED"
  | "TECHNICIAN_ASSIGNED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"

export interface Coordinates {
  lat: number
  lng: number
}

export interface Vehicle {
  id: string
  vin: string
  make: string
  model: string
  year: number
  region: string
  routeName: string
  buildBatch: string
  softwareVersion: string
  cargoPriority: number
  routeCriticality: number
  downtimeCostPerHour: number
  nextStopHours: number
  coordinates: Coordinates
  depotAffinityId: string
}

export interface VehicleSignalSnapshot {
  vehicleId: string
  timestamp: string
  coolantTemp: number
  oilPressure: number
  batteryVoltage: number
  turboBoost: number
  brakeWear: number
  exhaustTemp: number
  fuelLevel: number
  speed: number
  mileage: number
}

export interface VehicleFault {
  id: string
  vehicleId: string
  dtcCode: string
  subsystem: SubsystemKey
  severity: DtcSeverity
  title: string
  description: string
  occurredAt: string
  occurrences: number
}

export interface HealthScore {
  overall: number
  signalQuality: number
  trend: TrendDirection
  status: FleetStatus
  weakestSubsystem: SubsystemKey
  subsystems: Record<SubsystemKey, number>
}

export interface Depot {
  id: string
  name: string
  city: string
  region: string
  coordinates: Coordinates
  specialties: SubsystemKey[]
  totalBays: number
  occupiedBays: number
}

export interface Part {
  partNumber: string
  name: string
  subsystem: SubsystemKey
  leadDays: number
  price: number
}

export interface InventoryItem {
  depotId: string
  partNumber: string
  quantity: number
  reorderPoint: number
}

export interface Technician {
  id: string
  name: string
  depotId: string
  certifications: SubsystemKey[]
  currentLoad: number
  maxLoad: number
  firstTimeFixRate: number
}

export interface Alert {
  id: string
  vehicleId: string
  severity: DtcSeverity
  title: string
  subsystem: SubsystemKey
  occurredAt: string
  count: number
}

export interface PriorityBreakdown {
  safetyUrgency: number
  failureProximity: number
  businessImpact: number
  downtimeCost: number
  serviceWindow: number
  reasons: string[]
  aiAssessment?: AiPriorityAssessment | null
}

export interface AiPriorityAssessment {
  adjustedScore: number
  adjustment: number
  urgency: "routine" | "elevated" | "urgent" | "emergency"
  riskFactors: string[]
  recommendation: string
  confidence: number
  shouldEscalate: boolean
  model: string | null
  latencyMs: number | null
}

export interface AiDepotAssessment {
  recommendedDepotId: string
  reasoning: string
  confidence: number
  partsRisk: string | null
  logisticsNote: string | null
  model: string | null
  latencyMs: number | null
}

export interface AiTechnicianAssessment {
  recommendedTechnicianId: string
  reasoning: string
  confidence: number
  skillGapWarning: string | null
  estimatedRepairHours: number | null
  model: string | null
  latencyMs: number | null
}

export interface AiDispatchPlan {
  depotId: string
  depotReasoning: string
  technicianId: string
  techReasoning: string
  partsToStage: string[]
  estimatedRepairHours: number
  estimatedTotalCost: number
  urgencyLevel: "routine" | "elevated" | "urgent" | "emergency"
  watchPoints: string[]
  alternativePlan: {
    depotId: string
    technicianId: string | null
    reasoning: string
  } | null
  confidence: number
  agentTrace: string[]
  model: string | null
  latencyMs: number | null
}

export interface AiEscalation {
  type: string
  severity: "info" | "warning" | "critical"
  title: string
  description: string
  affectedEntities: string[]
  suggestedAction: string
  model: string | null
  latencyMs: number | null
}

export interface PriorityEntry {
  vehicleId: string
  score: number
  status: FleetStatus
  breakdown: PriorityBreakdown
}

export interface DepotRecommendation {
  depotId: string
  score: number
  etaHours: number
  distanceKm: number
  capacityOpen: number
  specialtyMatch: boolean
  partsReady: boolean
  reasons: string[]
  requiredParts: Part[]
  aiAssessment?: AiDepotAssessment | null
}

export interface TechnicianRecommendation {
  technicianId: string
  score: number
  reasons: string[]
  aiAssessment?: AiTechnicianAssessment | null
}

export interface ServiceTimelineEvent {
  status: ServiceRequestStatus
  at: string
  note: string
}

export interface ServiceRequest {
  id: string
  vehicleId: string
  priorityScore: number
  weakestSubsystem: SubsystemKey
  depotId: string | null
  technicianId: string | null
  requiredPartNumbers: string[]
  status: ServiceRequestStatus
  createdAt: string
  scheduledFor: string | null
  timeline: ServiceTimelineEvent[]
}

export interface ServiceHistoryRecord {
  id: string
  vehicleId: string
  depotId: string
  technicianId: string
  subsystem: SubsystemKey
  outcome: string
  resolvedAt: string
  firstTimeFix: boolean
  actualFault?: string | null
  partsUsed?: string[]
  repairDuration?: number | null
  diagnosisCorrect?: boolean | null
  technicianNotes?: string | null
}

export interface ServiceCompletionInput {
  actualFault?: string | null
  diagnosisCorrect?: boolean | null
  partsUsed?: string[]
  repairDuration?: number | null
  technicianNotes?: string | null
  firstTimeFix?: boolean | null
  depotRating?: number | null
  technicianRating?: number | null
  priorityRating?: number | null
}

export interface RewardSignalRecord {
  id: string
  aiDecisionLogId: string
  rewardType: string
  rewardScore: number
  rewardBreakdown: Record<string, number>
  createdAt: string
}

export interface DecisionQualityPoint {
  label: string
  aiScore: number
  heuristicScore: number
}

export interface ConfidenceCalibrationPoint {
  confidenceBucket: number
  actualAccuracy: number
  sampleSize: number
}

export interface DecisionReviewItem {
  decisionLogId: string
  vehicleId: string
  decisionType: string
  rewardScore: number
  createdAt: string
  summary: string
}

export interface FewShotExample {
  label: string
  decisionType: string
  vehicleId: string
  rewardScore: number
  summary: string
}

export interface WeightAdjustmentProposal {
  decisionType: string
  currentWeight: number
  proposedWeight: number
  reason: string
}

export interface LearnedPattern {
  pattern: string
  confidence: number
  supportingCount: number
}

export interface IntelligenceSnapshot {
  rewardSignals: RewardSignalRecord[]
  qualityTrend: DecisionQualityPoint[]
  confidenceCalibration: ConfidenceCalibrationPoint[]
  bestDecisions: DecisionReviewItem[]
  worstDecisions: DecisionReviewItem[]
  overrideRate: number
  fewShotExamples: FewShotExample[]
  weightAdjustmentProposals: WeightAdjustmentProposal[]
  learnedPatterns: LearnedPattern[]
}

export interface LivePulse {
  id: string
  kind: "tick" | "dispatch" | "progress" | "complete"
  message: string
  at: string
}

export interface DemoState {
  vehicles: Vehicle[]
  signals: Record<string, VehicleSignalSnapshot>
  faults: Record<string, VehicleFault[]>
  depots: Depot[]
  parts: Part[]
  inventory: InventoryItem[]
  technicians: Technician[]
  serviceRequests: ServiceRequest[]
  serviceHistory: ServiceHistoryRecord[]
  livePulse: LivePulse[]
  suppliers: SupplierInfo[]
  forensics: ForensicsSnapshot
}

export interface FleetOverview {
  totalVehicles: number
  healthyVehicles: number
  watchVehicles: number
  criticalVehicles: number
  openServiceRequests: number
  avgTurnaroundHours: number
  firstTimeFixRate: number
  bayUtilization: number
}

export interface DashboardSnapshot {
  overview: FleetOverview
  healthByVehicle: Record<string, HealthScore>
  alerts: Alert[]
  priorityQueue: PriorityEntry[]
  depotRecommendations: Record<string, DepotRecommendation[]>
  technicianRecommendations: Record<string, TechnicianRecommendation[]>
  livePulse: LivePulse[]
  aiEscalations?: AiEscalation[]
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2 — TELEMETRY FORENSICS
// ═══════════════════════════════════════════════════════════════

// --- Cohort Analysis (Sub-phase 2.1) ---

export type CohortDimension = "buildBatch" | "softwareVersion" | "region" | "model" | "dutyCycle" | "depot"

export interface Cohort {
  id: string
  name: string
  dimension: CohortDimension
  dimensionValue: string
  vehicleIds: string[]
  vehicleCount: number
  createdAt: string
}

export interface CohortFaultProfile {
  cohortId: string
  dtcCode: string
  subsystem: SubsystemKey
  faultCount: number
  faultRate: number
  baselineFaultRate: number
  rateRatio: number
  mtbfDays: number
}

export interface CohortComparison {
  cohortId: string
  cohortName: string
  baselineLabel: string
  faultProfiles: CohortFaultProfile[]
  overallFaultRate: number
  baselineOverallFaultRate: number
  avgHealthScore: number
  baselineAvgHealthScore: number
  statisticalSignificance: number
  isSignificant: boolean
  sampleSize: number
}

export interface CohortAnomaly {
  id: string
  cohortId: string
  cohortName: string
  dimension: CohortDimension
  dimensionValue: string
  anomalyType: string
  dtcCode: string
  subsystem: SubsystemKey
  rateRatio: number
  pValue: number
  affectedVehicleCount: number
  severity: "low" | "medium" | "high" | "critical"
  detectedAt: string
  summary: string
}

// --- Failure Pattern Detection (Sub-phase 2.2) ---

export type PatternStatus = "DETECTED" | "UNDER_REVIEW" | "CONFIRMED" | "ACTIVE" | "RETIRED"

export interface DtcSequenceStep {
  dtcCode: string
  subsystem: SubsystemKey
  severity: DtcSeverity
  medianDaysFromStart: number
}

export interface FailurePattern {
  id: string
  name: string
  type: "dtc_sequence" | "signal_degradation" | "spatial" | "cross_system"
  status: PatternStatus
  confidence: number
  supportCount: number
  totalVehicles: number
  supportRate: number
  sequence: DtcSequenceStep[]
  affectedSubsystems: SubsystemKey[]
  affectedRegions: string[]
  correlations: PatternCorrelation[]
  detectedAt: string
  summary: string
}

export interface PatternCorrelation {
  factorA: string
  factorB: string
  correlationType: "temporal" | "spatial" | "cross_system"
  strength: number
  description: string
}

export interface GeographicHeatmapPoint {
  lat: number
  lng: number
  intensity: number
  dtcCode: string
  vehicleCount: number
  region: string
}

// --- Investigation Workflow (Sub-phase 2.3) ---

export type InvestigationStatus =
  | "PATTERN_DETECTED"
  | "INVESTIGATION_OPENED"
  | "EVIDENCE_COLLECTED"
  | "ROOT_CAUSE_IDENTIFIED"
  | "CONTAINMENT_RECOMMENDED"
  | "ACTION_TAKEN"
  | "VERIFIED"

export type ContainmentType =
  | "monitor"
  | "service_campaign"
  | "software_update"
  | "supplier_escalation"
  | "training_bulletin"
  | "safety_recall"

export interface Investigation {
  id: string
  patternId: string | null
  anomalyId: string | null
  title: string
  status: InvestigationStatus
  rootCause: string | null
  affectedVehicleIds: string[]
  affectedVehicleCount: number
  containment: ContainmentRecommendation | null
  timeline: InvestigationTimelineEvent[]
  createdAt: string
  updatedAt: string
}

export interface InvestigationTimelineEvent {
  status: InvestigationStatus
  at: string
  note: string
}

export interface EvidencePackage {
  investigationId: string
  affectedVehicleIds: string[]
  signalComparisons: SignalComparison[]
  dtcHistory: { vehicleId: string; dtcCode: string; occurredAt: string; severity: DtcSeverity }[]
  serviceHistory: { vehicleId: string; subsystem: SubsystemKey; outcome: string; resolvedAt: string }[]
  cohortContext: { dimension: CohortDimension; value: string; faultRate: number; baselineRate: number }[]
  supplierContext: SupplierEvidence[]
  environmentalContext: { region: string; faultRate: number }[]
}

export interface SignalComparison {
  signalName: string
  affectedAvg: number
  baselineAvg: number
  deviation: number
  unit: string
}

export interface SupplierEvidence {
  supplierName: string
  componentType: string
  batchId: string
  faultRate: number
  baselineFaultRate: number
  rateRatio: number
}

export interface ContainmentRecommendation {
  type: ContainmentType
  urgency: "low" | "medium" | "high" | "critical"
  affectedVehicleCount: number
  estimatedCostPerVehicle: number
  estimatedTotalCost: number
  costOfInaction: number
  netSavings: number
  suggestedTimeline: string
  reasoning: string[]
}

// --- Supplier Scorecards ---

export interface SupplierInfo {
  id: string
  name: string
  componentTypes: string[]
  activeBatches: string[]
}

export interface SupplierScorecard {
  supplierId: string
  supplierName: string
  componentType: string
  overallFaultRate: number
  baselineFaultRate: number
  rateRatio: number
  trend: TrendDirection
  affectedVehicleCount: number
  totalVehicleCount: number
  batches: SupplierBatchScore[]
}

export interface SupplierBatchScore {
  batchId: string
  faultRate: number
  vehicleCount: number
  trend: TrendDirection
}

// --- Forensics Snapshot ---

export interface ForensicsSnapshot {
  cohorts: Cohort[]
  anomalies: CohortAnomaly[]
  patterns: FailurePattern[]
  investigations: Investigation[]
  supplierScorecards: SupplierScorecard[]
  heatmapData: GeographicHeatmapPoint[]
}
