import type { ServiceRequestStatus, SubsystemKey } from "./types"

export const SUBSYSTEMS: SubsystemKey[] = [
  "engine",
  "cooling",
  "brakes",
  "electrical",
  "exhaust",
  "turbo",
  "fuel",
  "transmission"
]

export const SERVICE_FLOW: ServiceRequestStatus[] = [
  "DETECTED",
  "PRIORITIZED",
  "DEPOT_ASSIGNED",
  "PARTS_CONFIRMED",
  "TECHNICIAN_ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CLOSED"
]

export const PARTS_BY_SUBSYSTEM: Record<SubsystemKey, { partNumber: string; name: string }[]> = {
  engine: [
    { partNumber: "ENG-PUMP-11", name: "High-pressure oil pump" },
    { partNumber: "ENG-SENS-21", name: "Crankshaft position sensor" }
  ],
  cooling: [
    { partNumber: "COOL-SENS-15", name: "Coolant temperature sensor" },
    { partNumber: "COOL-PUMP-04", name: "Coolant circulation pump" }
  ],
  brakes: [
    { partNumber: "BRK-PAD-09", name: "Front brake pad kit" },
    { partNumber: "BRK-LINE-17", name: "Hydraulic line service kit" }
  ],
  electrical: [
    { partNumber: "ELE-ALT-31", name: "Alternator assembly" },
    { partNumber: "ELE-BATT-12", name: "Battery control module" }
  ],
  exhaust: [
    { partNumber: "EXH-SENS-42", name: "NOx sensor kit" },
    { partNumber: "EXH-DPF-07", name: "DPF regeneration cartridge" }
  ],
  turbo: [
    { partNumber: "TRB-KIT-88", name: "Turbocharger repair kit" },
    { partNumber: "TRB-HOSE-14", name: "Boost hose replacement set" }
  ],
  fuel: [
    { partNumber: "FUEL-PUMP-03", name: "Fuel pump assembly" },
    { partNumber: "FUEL-FLTR-29", name: "Heavy-duty fuel filter" }
  ],
  transmission: [
    { partNumber: "TRN-VALVE-52", name: "Valve body service kit" },
    { partNumber: "TRN-OIL-60", name: "Transmission oil pack" }
  ]
}
