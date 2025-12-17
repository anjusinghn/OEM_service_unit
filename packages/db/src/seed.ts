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
