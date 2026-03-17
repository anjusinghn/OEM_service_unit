export { cacheRepository } from "./cache-repository"
export { depotRepository } from "./depot-repository"
export { faultRepository } from "./fault-repository"
export { healthRepository } from "./health-repository"
export { partsRepository } from "./parts-repository"
export { priorityRepository } from "./priority-repository"
export { rewardSignalRepository } from "./reward-signal-repository"
export { serviceHistoryRepository } from "./service-history-repository"
export { serviceRequestRepository } from "./service-request-repository"
export { signalRepository } from "./signal-repository"
export { technicianRepository } from "./technician-repository"
export { vehicleRepository } from "./vehicle-repository"

export type { HealthTrendOptions, HealthSnapshotCreateInput } from "./health-repository"
export type { OutcomeStatsFilter, ServiceHistoryOutcomeStats } from "./service-history-repository"
export type {
  AssignDepotAndTechnicianInput,
  CompleteServiceRequestInput,
  CreateServiceRequestInput,
  UpdateServiceStatusInput
} from "./service-request-repository"
export type { SignalRangeOptions, SignalSnapshotCreateInput } from "./signal-repository"
export type { PriorityEntryUpsertInput, PriorityQueueOptions, PrioritySnapshotCreateInput } from "./priority-repository"
export type { CreateRewardSignalInput } from "./reward-signal-repository"
export type { ReservePartInput } from "./parts-repository"
export type { UpsertActiveFaultInput } from "./fault-repository"
