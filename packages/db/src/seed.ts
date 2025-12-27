import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";

import { prisma } from "./schema";

// ── Deterministic PRNG ──────────────────────────────────────
const seeded = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const rng = seeded(42);

const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const shift = (base: number, delta: number) => base + (rng() - 0.5) * delta;
const round = (v: number, d = 1) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
const addHours = (date: Date, hours: number) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

// ── Static Data ─────────────────────────────────────────────

const CITIES = [
  { city: "Pune", region: "West", lat: 18.5204, lng: 73.8567 },
  { city: "Jaipur", region: "North", lat: 26.9124, lng: 75.7873 },
  { city: "Bengaluru", region: "South", lat: 12.9716, lng: 77.5946 },
  { city: "Chennai", region: "South", lat: 13.0827, lng: 80.2707 },
  { city: "Nagpur", region: "Central", lat: 21.1458, lng: 79.0882 },
  { city: "Delhi", region: "North", lat: 28.6139, lng: 77.209 },
  { city: "Hyderabad", region: "South", lat: 17.385, lng: 78.4867 },
  { city: "Ahmedabad", region: "West", lat: 23.0225, lng: 72.5714 },
  { city: "Kolkata", region: "East", lat: 22.5726, lng: 88.3639 },
  { city: "Lucknow", region: "North", lat: 26.8467, lng: 80.9462 },
];

const MODELS = [
  "Atlas Hauler",
  "RidgeRunner",
  "MetroMover",
  "CargoMax",
  "Axion Bus",
];

const SUBSYSTEMS = [
  "engine",
  "cooling",
  "brakes",
  "electrical",
  "exhaust",
  "turbo",
  "fuel",
  "transmission",
] as const;

type SubsystemKey = (typeof SUBSYSTEMS)[number];

const SUBSYSTEM_ENUM_MAP: Record<string, string> = {
  engine: "ENGINE",
  cooling: "COOLING",
  brakes: "BRAKES",
  electrical: "ELECTRICAL",
  exhaust: "EXHAUST",
  turbo: "TURBO",
  fuel: "FUEL",
  transmission: "TRANSMISSION",
};

const FAULT_PROFILES: Record<
  SubsystemKey,
  { code: string; title: string; description: string }
> = {
  engine: {
    code: "P0524",
    title: "Engine oil pressure falling",
    description: "Oil pressure trend suggests lubrication system degradation.",
  },
  cooling: {
    code: "P0217",
    title: "Engine over-temperature risk",
    description: "Coolant loop is running hotter than normal under load.",
  },
  brakes: {
    code: "C1234",
    title: "Brake wear threshold exceeded",
    description: "Brake pad wear is approaching unsafe limits.",
  },
  electrical: {
    code: "B1101",
    title: "Charging system instability",
    description: "Battery and alternator voltage readings are unstable.",
  },
  exhaust: {
    code: "P0420",
    title: "Aftertreatment efficiency dropping",
    description: "DPF / NOx system efficiency has fallen below baseline.",
  },
  turbo: {
    code: "P0299",
    title: "Turbo boost under target",
    description: "Boost pressure trend is below requested torque demand.",
  },
  fuel: {
    code: "P0087",
    title: "Fuel rail pressure low",
    description: "Fuel delivery pressure is insufficient for current demand.",
  },
  transmission: {
    code: "P0715",
    title: "Transmission input signal drift",
    description: "Shift behavior suggests valve body or input sensor wear.",
  },
};

const PARTS_BY_SUBSYSTEM: Record<
  SubsystemKey,
  { partNumber: string; name: string }[]
> = {
  engine: [
    { partNumber: "ENG-PUMP-11", name: "High-pressure oil pump" },
    { partNumber: "ENG-SENS-21", name: "Crankshaft position sensor" },
  ],
  cooling: [
    { partNumber: "COOL-SENS-15", name: "Coolant temperature sensor" },
    { partNumber: "COOL-PUMP-04", name: "Coolant circulation pump" },
  ],
  brakes: [
    { partNumber: "BRK-PAD-09", name: "Front brake pad kit" },
    { partNumber: "BRK-LINE-17", name: "Hydraulic line service kit" },
  ],
  electrical: [
    { partNumber: "ELE-ALT-31", name: "Alternator assembly" },
    { partNumber: "ELE-BATT-12", name: "Battery control module" },
  ],
  exhaust: [
    { partNumber: "EXH-SENS-42", name: "NOx sensor kit" },
    { partNumber: "EXH-DPF-07", name: "DPF regeneration cartridge" },
  ],
  turbo: [
    { partNumber: "TRB-KIT-88", name: "Turbocharger repair kit" },
    { partNumber: "TRB-HOSE-14", name: "Boost hose replacement set" },
  ],
  fuel: [
    { partNumber: "FUEL-PUMP-03", name: "Fuel pump assembly" },
    { partNumber: "FUEL-FLTR-29", name: "Heavy-duty fuel filter" },
  ],
  transmission: [
    { partNumber: "TRN-VALVE-52", name: "Valve body service kit" },
    { partNumber: "TRN-OIL-60", name: "Transmission oil pack" },
  ],
};

const FIRST_NAMES = [
  "Rajesh",
  "Mira",
  "Ayaan",
  "Divya",
  "Kiran",
  "Pranav",
  "Ishita",
  "Naveen",
  "Sneha",
  "Vikram",
  "Ananya",
  "Rohit",
  "Priya",
  "Arjun",
  "Kavita",
  "Suresh",
  "Meera",
  "Aditya",
  "Pooja",
  "Deepak",
];

const LAST_NAMES = [
  "K",
  "Rao",
  "Singh",
  "Patil",
  "Mehta",
  "Das",
  "Jain",
  "Verma",
  "Sharma",
  "Gupta",
  "Kumar",
  "Reddy",
];

const BAY_TYPES = [
  "GENERAL",
  "ENGINE",
  "ELECTRICAL",
  "BODY",
  "INSPECTION",
] as const;

// ── Seed Function ───────────────────────────────────────────

export async function resetDatabase(db: PrismaClient = prisma) {
  await db.partReservation.deleteMany();
  await db.slaTracking.deleteMany();
  await db.serviceTimeline.deleteMany();
  await db.serviceRequest.deleteMany();
  await db.priorityEntry.deleteMany();
  await db.prioritySnapshot.deleteMany();
  await db.vehicleHealthSnapshot.deleteMany();
  await db.serviceHistory.deleteMany();
  await db.alert.deleteMany();
  await db.vehicleFault.deleteMany();
  await db.vehicleEvent.deleteMany();
  await db.vehicleSignal.deleteMany();
  await db.inventoryItem.deleteMany();
  await db.partSubstitute.deleteMany();
  await db.part.deleteMany();
  await db.bay.deleteMany();
  await db.technician.deleteMany();
  await db.webhook.deleteMany();
  await db.notificationPreference.deleteMany();
  await db.cohortMember.deleteMany();
  await db.cohortComparison.deleteMany();
  await db.cohortAnomaly.deleteMany();
  await db.forensicsInvestigationEvent.deleteMany();
  await db.forensicsInvestigation.deleteMany();
  await db.forensicsPattern.deleteMany();
  await db.forensicsCohort.deleteMany();
  await db.supplierScorecard.deleteMany();
  await db.supplierInfo.deleteMany();
  await db.signalDefinition.deleteMany();
  await db.dtcCode.deleteMany();
  await db.vehicle.deleteMany();
  await db.depot.deleteMany();
  await db.oemConnection.deleteMany();
  await db.apiKey.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();
}

export async function seedDatabase(db: PrismaClient = prisma) {
  const prisma = db;
  console.log("🌱 Seeding kazindustries database...\n");

  // ── 1. Organization ─────────────────────────────────────
  console.log("  → Creating organization...");
  const org = await prisma.organization.create({
    data: {
      id: "org-kazindustries-demo",
      name: "kazindustries Demo Fleet",
    },
  });

  // ── 2. Users ────────────────────────────────────────────
  console.log("  → Creating users...");
  const defaultPasswordHash = await bcrypt.hash("kazadmin123", 12);
  const users = [
    {
      id: "user-admin-001",
      name: "Admin User",
      email: "admin@kazindustries.dev",
      role: "PLATFORM_ADMIN" as const,
      passwordHash: defaultPasswordHash,
    },
    {
      id: "user-oem-001",
      name: "OEM Manager",
      email: "oem@kazindustries.dev",
      role: "OEM_ADMIN" as const,
      passwordHash: defaultPasswordHash,
    },
    {
      id: "user-depot-001",
      name: "Depot Manager (Pune)",
      email: "depot-pune@kazindustries.dev",
      role: "DEPOT_MANAGER" as const,
      passwordHash: defaultPasswordHash,
    },
    {
      id: "user-tech-001",
      name: "Rajesh K",
      email: "rajesh@kazindustries.dev",
      role: "TECHNICIAN" as const,
      passwordHash: defaultPasswordHash,
    },
    {
      id: "user-viewer-001",
      name: "Dashboard Viewer",
      email: "viewer@kazindustries.dev",
      role: "VIEWER" as const,
      passwordHash: defaultPasswordHash,
    },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        ...u,
        organizationId: org.id,
      },
    });
  }

  // ── 3. OEM Connection ──────────────────────────────────
  console.log("  → Creating OEM connection...");
  await prisma.oemConnection.create({
    data: {
      id: "oem-conn-mock",
      organizationId: org.id,
      adapterType: "mock",
      name: "Mock OEM Telemetry Feed",
      status: "CONNECTED",
      lastSyncAt: new Date(),
      config: {
        vehicleCount: 96,
        tickIntervalMs: 12000,
        faultRate: 0.16,
      },
    },
  });

  // ── 4. DTC Codes ───────────────────────────────────────
  console.log("  → Creating DTC code registry...");
  const dtcEntries = Object.entries(FAULT_PROFILES).map(
    ([subsystem, profile]) => ({
      id: `dtc-${profile.code}`,
      code: profile.code,
      system:
        subsystem === "brakes"
          ? "chassis"
          : subsystem === "electrical"
            ? "body"
            : "powertrain",
      subsystem: SUBSYSTEM_ENUM_MAP[subsystem] as any,
      severity:
        subsystem === "brakes" || subsystem === "electrical"
          ? ("CRITICAL" as const)
          : ("WARNING" as const),
      description: profile.description,
      knownCauses: [
        `Worn ${subsystem} components`,
        `Sensor malfunction in ${subsystem} subsystem`,
      ],
      remedies: [
        `Inspect ${subsystem} subsystem`,
        `Replace affected components`,
      ],
      relatedCodes: [] as string[],
    }),
  );

  // Add cross-references
  dtcEntries[0].relatedCodes = ["P0217"]; // engine ↔ cooling
  dtcEntries[1].relatedCodes = ["P0524"];
  dtcEntries[4].relatedCodes = ["P0299"]; // exhaust ↔ turbo
  dtcEntries[5].relatedCodes = ["P0420"];

  for (const dtc of dtcEntries) {
    await prisma.dtcCode.create({ data: dtc });
  }

  // ── 5. Signal Definitions ─────────────────────────────
  console.log("  → Creating signal definitions...");
  const signalDefs = [
    {
      name: "coolant_temp",
      unit: "°C",
      minValue: -40,
      maxValue: 150,
      sourceSystem: "ECU",
    },
    {
      name: "oil_pressure",
      unit: "PSI",
      minValue: 0,
      maxValue: 120,
      sourceSystem: "ECU",
    },
    {
      name: "battery_voltage",
      unit: "V",
      minValue: 0,
      maxValue: 30,
      sourceSystem: "BCM",
    },
    {
      name: "turbo_boost",
      unit: "bar",
      minValue: 0,
      maxValue: 4,
      sourceSystem: "ECU",
    },
    {
      name: "brake_wear",
      unit: "%",
      minValue: 0,
      maxValue: 100,
      sourceSystem: "ABS",
    },
    {
      name: "exhaust_temp",
      unit: "°C",
      minValue: 0,
      maxValue: 900,
      sourceSystem: "ECU",
    },
    {
      name: "fuel_level",
      unit: "%",
      minValue: 0,
      maxValue: 100,
      sourceSystem: "BCM",
    },
    {
      name: "speed",
      unit: "km/h",
      minValue: 0,
      maxValue: 250,
      sourceSystem: "ABS",
    },
    {
      name: "mileage",
      unit: "km",
      minValue: 0,
      maxValue: null,
      sourceSystem: "ECU",
    },
  ];

  for (const sd of signalDefs) {
    await prisma.signalDefinition.create({ data: sd });
  }

  // ── 6. Depots ──────────────────────────────────────────
  console.log("  → Creating depots...");
  const depotRecords: { id: string; city: string }[] = [];

  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    const id = `depot-${String(i + 1).padStart(3, "0")}`;
    const specialties = [
      SUBSYSTEMS[i % SUBSYSTEMS.length],
      SUBSYSTEMS[(i + 2) % SUBSYSTEMS.length],
      SUBSYSTEMS[(i + 4) % SUBSYSTEMS.length],
    ];
    const totalBays = 10 + (i % 3) * 2;
    const occupiedBays = 4 + (i % 4);

    await prisma.depot.create({
      data: {
        id,
        organizationId: org.id,
        name: `${c.city} Response Hub`,
        city: c.city,
        region: c.region,
        latitude: c.lat,
        longitude: c.lng,
        specialties,
        totalBays,
        occupiedBays,
        operatingHours: {
          weekdays: "06:00-22:00",
          saturday: "08:00-18:00",
          sunday: "closed",
        },
      },
    });

    depotRecords.push({ id, city: c.city });

    // Create bays for each depot
    for (let b = 0; b < totalBays; b++) {
      await prisma.bay.create({
        data: {
          depotId: id,
          name: `Bay ${String(b + 1).padStart(2, "0")}`,
          type: BAY_TYPES[b % BAY_TYPES.length] as any,
          status: b < occupiedBays ? "OCCUPIED" : "AVAILABLE",
        },
      });
    }
  }

  // ── 7. Parts Catalog ───────────────────────────────────
  console.log("  → Creating parts catalog...");
  for (const [subsystem, parts] of Object.entries(PARTS_BY_SUBSYSTEM)) {
    for (let i = 0; i < parts.length; i++) {
      await prisma.part.create({
        data: {
          partNumber: parts[i].partNumber,
          name: parts[i].name,
          subsystem,
          leadDays: 1 + (i % 3),
          price: 2800 + i * 1700,
          criticality:
            subsystem === "brakes" || subsystem === "electrical"
              ? "safety-critical"
              : "operational",
        },
      });
    }
  }

  // ── 8. Inventory ───────────────────────────────────────
  console.log("  → Creating depot inventory...");
  const allParts = Object.values(PARTS_BY_SUBSYSTEM).flat();

  for (const depot of depotRecords) {
    for (const part of allParts) {
      await prisma.inventoryItem.create({
        data: {
          depotId: depot.id,
          partNumber: part.partNumber,
          quantity: 1 + Math.round(rng() * 8),
          reorderPoint: 2,
        },
      });
    }
  }

  // ── 9. Technicians ─────────────────────────────────────
  console.log("  → Creating technicians...");
  const technicianRecords: { id: string; depotId: string }[] = [];

  for (let d = 0; d < depotRecords.length; d++) {
    const depot = depotRecords[d];
    for (let t = 0; t < 5; t++) {
      const id = `tech-${d + 1}-${String(t + 1).padStart(3, "0")}`;
      const firstName = FIRST_NAMES[(d + t) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(d * 2 + t) % LAST_NAMES.length];
      const certs = [
        SUBSYSTEMS[(d + t) % SUBSYSTEMS.length],
        SUBSYSTEMS[(d + t + 3) % SUBSYSTEMS.length],
      ];

      await prisma.technician.create({
        data: {
          id,
          depotId: depot.id,
          name: `${firstName} ${lastName}`,
          certifications: certs,
          currentLoad: Math.round(rng() * 3),
          maxLoad: 5,
          firstTimeFixRate: round(0.72 + rng() * 0.24, 2),
        },
      });

      technicianRecords.push({ id, depotId: depot.id });
    }
  }

  // ── 10. Vehicles ───────────────────────────────────────
  console.log("  → Creating vehicles...");
  const vehicleRecords: {
    id: string;
    depotAffinityId: string;
    lat: number;
    lng: number;
  }[] = [];

  for (let i = 0; i < 96; i++) {
    const depotIdx = i % depotRecords.length;
    const depot = depotRecords[depotIdx];
    const cityData = CITIES[depotIdx];
    const id = `veh-${String(i + 1).padStart(3, "0")}`;
    const lat = shift(cityData.lat, 1.8);
    const lng = shift(cityData.lng, 1.8);

    await prisma.vehicle.create({
      data: {
        id,
        organizationId: org.id,
        vin: `KAZ${String(2026 + (i % 2)).slice(-2)}${String(i + 1).padStart(11, "0")}`,
        make: i % 5 === 0 ? "VW" : "kazindustries-demo",
        model: MODELS[i % MODELS.length],
        year: 2022 + (i % 4),
        buildBatch: `BATCH-24Q${1 + (i % 4)}`,
        softwareVersion: `v3.${i % 5}.${i % 3}`,
        region: cityData.region,
        routeName: `${cityData.city} Corridor ${1 + (i % 4)}`,
        cargoPriority: 45 + Math.round(rng() * 50),
        routeCriticality: 40 + Math.round(rng() * 55),
        downtimeCostPerHour: 850 + Math.round(rng() * 2350),
        nextStopHours: round(2 + rng() * 18, 1),
        latitude: lat,
        longitude: lng,
        depotAffinityId: depot.id,
      },
    });

    vehicleRecords.push({ id, depotAffinityId: depot.id, lat, lng });
  }

  // ── 11. Vehicle Signals (last 24h snapshots) ──────────
  console.log("  → Generating vehicle signal snapshots (24h history)...");
  const now = new Date();
  const SIGNAL_BATCH_SIZE = 500;
  let signalBatch: Array<{
    vehicleId: string;
    timestamp: Date;
    coolantTemp: number;
    oilPressure: number;
    batteryVoltage: number;
    turboBoost: number;
    brakeWear: number;
    exhaustTemp: number;
    fuelLevel: number;
    speed: number;
    mileage: number;
  }> = [];

  for (const veh of vehicleRecords) {
    const faultBias = rng() > 0.84 ? 1.7 : rng() > 0.68 ? 0.7 : 0;

    // Create 24 hourly snapshots per vehicle
    for (let h = 23; h >= 0; h--) {
      const degradationFactor = faultBias * (1 - h / 24); // gradual degradation

      signalBatch.push({
        vehicleId: veh.id,
        timestamp: addHours(now, -h),
        coolantTemp: round(shift(87 + degradationFactor * 6, 8), 1),
        oilPressure: round(shift(48 - degradationFactor * 8, 9), 1),
        batteryVoltage: round(shift(13.4 - degradationFactor * 0.7, 0.8), 2),
        turboBoost: round(shift(1.7 - degradationFactor * 0.45, 0.35), 2),
        brakeWear: round(shift(32 + degradationFactor * 24, 16), 1),
        exhaustTemp: round(shift(365 + degradationFactor * 95, 44), 1),
        fuelLevel: round(shift(62, 28), 1),
        speed: round(Math.max(0, shift(56, 22)), 1),
        mileage: round(40000 + rng() * 185000 + h * 42, 0),
      });

      if (signalBatch.length >= SIGNAL_BATCH_SIZE) {
        await prisma.vehicleSignal.createMany({ data: signalBatch });
        signalBatch = [];
      }
    }
  }

  if (signalBatch.length > 0) {
    await prisma.vehicleSignal.createMany({ data: signalBatch });
  }

  // ── 12. Vehicle Faults ─────────────────────────────────
  console.log("  → Injecting vehicle faults...");
  let faultCount = 0;

  for (const veh of vehicleRecords) {
    const faultBias = rng() > 0.84 ? 1.7 : rng() > 0.68 ? 0.7 : 0;
    if (faultBias === 0) continue;

    const subsystem = pick([...SUBSYSTEMS]);
    const profile = FAULT_PROFILES[subsystem];
    const isCritical = faultBias > 1;

    await prisma.vehicleFault.create({
      data: {
        vehicleId: veh.id,
        dtcCode: profile.code,
        subsystem,
        severity: isCritical ? "critical" : rng() > 0.7 ? "safety" : "warning",
        title: profile.title,
        description: profile.description,
        occurredAt: addHours(now, -(1 + Math.round(rng() * 24))),
        occurrences: 1 + Math.round(rng() * 5),
        isActive: true,
      },
    });

    faultCount++;

    // Create corresponding alert
    await prisma.alert.create({
      data: {
        vehicleId: veh.id,
        severity: isCritical ? "critical" : "warning",
        title: profile.title,
        subsystem,
        occurredAt: addHours(now, -(1 + Math.round(rng() * 24))),
        count: 1 + Math.round(rng() * 5),
        status: "NEW",
      },
    });
  }

  // ── 13. Service History ────────────────────────────────
  console.log("  → Creating service history records...");
  for (let i = 0; i < 28; i++) {
    const vehicleIdx = (i * 3) % vehicleRecords.length;
    const veh = vehicleRecords[vehicleIdx];
    const depotIdx = i % depotRecords.length;
    const depot = depotRecords[depotIdx];
    const tech = technicianRecords.find((t) => t.depotId === depot.id);
    const subsystem = pick([...SUBSYSTEMS]);
    const profile = FAULT_PROFILES[subsystem];

    await prisma.serviceHistory.create({
      data: {
        vehicleId: veh.id,
        depotId: depot.id,
        technicianId: tech?.id ?? technicianRecords[0].id,
        subsystem,
        outcome: `Resolved ${profile.title.toLowerCase()}`,
        resolvedAt: addHours(now, -(48 + i * 5)),
        firstTimeFix: rng() > 0.16,
        actualFault: profile.title,
        partsUsed: PARTS_BY_SUBSYSTEM[subsystem].map((p) => p.partNumber),
        repairDuration: round(1.5 + rng() * 6, 1),
        diagnosisCorrect: rng() > 0.12,
        technicianNotes: `Standard ${subsystem} maintenance procedure completed successfully.`,
      },
    });
  }

  // ── 14. Priority Entries (pre-computed for top vehicles)
  console.log("  → Computing initial priority entries...");

  for (const veh of vehicleRecords) {
    const safetyUrgency = round(rng() * 80 + 10, 1);
    const failureProximity = round(rng() * 70 + 15, 1);
    const businessImpact = round(rng() * 60 + 20, 1);
    const downtimeCost = round(rng() * 50 + 25, 1);
    const serviceWindow = round(rng() * 80 + 10, 1);

    const score = round(
      safetyUrgency * 0.3 +
        failureProximity * 0.25 +
        businessImpact * 0.2 +
        downtimeCost * 0.15 +
        serviceWindow * 0.1,
      1,
    );

    const status = score > 65 ? "critical" : score > 45 ? "watch" : "healthy";

    await prisma.priorityEntry.create({
      data: {
        vehicleId: veh.id,
        score,
        status,
        safetyUrgency,
        failureProximity,
        businessImpact,
        downtimeCost,
        serviceWindow,
        reasons: [
          `Safety urgency: ${safetyUrgency}`,
          `Failure proximity: ${failureProximity}`,
          `Business impact: ${businessImpact}`,
        ],
      },
    });
  }

  // ── 15. Sample Service Requests (active workflow) ─────
  console.log("  → Creating sample active service requests...");

  const sampleStatuses = [
    "DETECTED",
    "PRIORITIZED",
    "DEPOT_ASSIGNED",
    "PARTS_CONFIRMED",
    "TECHNICIAN_ASSIGNED",
    "SCHEDULED",
    "IN_PROGRESS",
  ] as const;

  for (let i = 0; i < 5; i++) {
    const veh = vehicleRecords[i * 7];
    const depot = depotRecords[i % depotRecords.length];
    const tech = technicianRecords.find((t) => t.depotId === depot.id);
    const subsystem = pick([...SUBSYSTEMS]);
    const status = sampleStatuses[i % sampleStatuses.length];
    const profile = FAULT_PROFILES[subsystem];
    const reqId = `req-${String(i + 1).padStart(3, "0")}`;
    const createdAt = addHours(now, -(12 + i * 3));

    const statusIndex = sampleStatuses.indexOf(status);
    const hasDepot = statusIndex >= 2;
    const hasTech = statusIndex >= 4;

    await prisma.serviceRequest.create({
      data: {
        id: reqId,
        vehicleId: veh.id,
        priorityScore: round(50 + rng() * 45, 1),
        weakestSubsystem: subsystem,
        depotId: hasDepot ? depot.id : null,
        technicianId: hasTech ? (tech?.id ?? null) : null,
        requiredPartNumbers: PARTS_BY_SUBSYSTEM[subsystem].map(
          (p) => p.partNumber,
        ),
        status: status as any,
        createdAt,
        scheduledFor: statusIndex >= 5 ? addHours(now, 6 + i * 2) : null,
      },
    });

    // Build timeline up to current status
    const allStatuses = [
      "DETECTED",
      "PRIORITIZED",
      "DEPOT_ASSIGNED",
      "PARTS_CONFIRMED",
      "TECHNICIAN_ASSIGNED",
      "SCHEDULED",
      "IN_PROGRESS",
    ];

    for (let s = 0; s <= statusIndex; s++) {
      const timelineNotes: Record<string, string> = {
        DETECTED: `Signal Trust flagged ${profile.title.toLowerCase()}.`,
        PRIORITIZED: `Vehicle ranked in priority queue.`,
        DEPOT_ASSIGNED: `Assigned to ${depot.id} based on proximity and capability.`,
        PARTS_CONFIRMED: `All required parts confirmed in stock at depot.`,
        TECHNICIAN_ASSIGNED: `Technician ${tech?.id ?? "unknown"} accepted the assignment.`,
        SCHEDULED: `Service bay window booked.`,
        IN_PROGRESS: `Vehicle entered active service bay.`,
      };

      await prisma.serviceTimeline.create({
        data: {
          serviceRequestId: reqId,
          status: allStatuses[s],
          note:
            timelineNotes[allStatuses[s]] ??
            `Transitioned to ${allStatuses[s]}.`,
          at: addHours(createdAt, s * 0.5),
        },
      });
    }

    // SLA tracking for active requests
    await prisma.slaTracking.create({
      data: {
        serviceRequestId: reqId,
        detectedAt: createdAt,
        assignedAt: hasDepot ? addHours(createdAt, 1) : null,
        serviceStartedAt: statusIndex >= 6 ? addHours(createdAt, 3) : null,
        detectionToAssignMs: hasDepot ? 3600000 : null,
        assignToStartMs: statusIndex >= 6 ? 7200000 : null,
        breached: false,
      },
    });
  }

  // ── 16. Webhooks (sample) ─────────────────────────────
  console.log("  → Creating sample webhook...");
  await prisma.webhook.create({
    data: {
      url: "https://hooks.example.com/kazindustries",
      events: [
        "service_request.created",
        "service_request.completed",
        "alert.critical",
        "sla.breached",
      ],
      secret: "whsec_demo_secret_key_placeholder",
      isActive: true,
    },
  });

  // ── Summary ────────────────────────────────────────────
  const counts = {
    organizations: await prisma.organization.count(),
    users: await prisma.user.count(),
    oemConnections: await prisma.oemConnection.count(),
    dtcCodes: await prisma.dtcCode.count(),
    signalDefinitions: await prisma.signalDefinition.count(),
    vehicles: await prisma.vehicle.count(),
    depots: await prisma.depot.count(),
    bays: await prisma.bay.count(),
    parts: await prisma.part.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    technicians: await prisma.technician.count(),
    vehicleSignals: await prisma.vehicleSignal.count(),
    vehicleFaults: faultCount,
    alerts: await prisma.alert.count(),
    priorityEntries: await prisma.priorityEntry.count(),
    serviceRequests: await prisma.serviceRequest.count(),
    serviceHistory: await prisma.serviceHistory.count(),
    slaTracking: await prisma.slaTracking.count(),
    webhooks: await prisma.webhook.count(),
  };

  console.log("\n✅ Seed complete! Summary:");
  console.log("─".repeat(48));
  for (const [table, count] of Object.entries(counts)) {
    const label = table
      .replace(/([A-Z])/g, " $1")
      .toLowerCase()
      .trim();
    console.log(`  ${label.padEnd(24)} ${String(count).padStart(6)}`);
  }
  console.log("─".repeat(48));
  console.log(
    `\n🚀 Database is ready for Phase 1 demo.\n   Run: pnpm db:studio to inspect data in Prisma Studio.\n`,
  );
}

export async function resetAndSeed(db: PrismaClient = prisma) {
  await resetDatabase(db);
  await seedDatabase(db);
}

async function main() {
  await resetAndSeed();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      console.error("❌ Seed failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
