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
