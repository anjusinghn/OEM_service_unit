import { createMockState } from "@kaz/oem-adapters-mock"

const state = createMockState(101)

console.log("[simulator] mock OEM fleet prepared")
console.log(`[simulator] vehicles=${state.vehicles.length} depots=${state.depots.length} technicians=${state.technicians.length}`)
console.log(`[simulator] seeded faults=${Object.values(state.faults).flat().length}`)
console.log(`[simulator] top vehicle=${state.vehicles[0].vin} route=${state.vehicles[0].routeName}`)
