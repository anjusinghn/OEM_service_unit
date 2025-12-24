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
