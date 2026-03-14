import { integer, jsonb, numeric, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core"

export const organizations = pgTable("organizations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  organizationId: varchar("organization_id", { length: 64 }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const vehicles = pgTable("vehicles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  vin: varchar("vin", { length: 32 }).notNull(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  buildBatch: text("build_batch").notNull(),
  softwareVersion: text("software_version").notNull(),
  region: text("region").notNull(),
  coordinates: jsonb("coordinates").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
})

export const depots = pgTable("depots", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  city: text("city").notNull(),
  totalBays: integer("total_bays").notNull(),
  occupiedBays: integer("occupied_bays").notNull(),
  specialties: jsonb("specialties").notNull()
})

export const technicians = pgTable("technicians", {
  id: varchar("id", { length: 64 }).primaryKey(),
  depotId: varchar("depot_id", { length: 64 }).notNull(),
  name: text("name").notNull(),
  certifications: jsonb("certifications").notNull(),
  currentLoad: integer("current_load").notNull(),
  maxLoad: integer("max_load").notNull(),
  firstTimeFixRate: numeric("first_time_fix_rate", { precision: 5, scale: 2 }).notNull()
})

export const vehicleSignals = pgTable("vehicle_signals", {
  vehicleId: varchar("vehicle_id", { length: 64 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  coolantTemp: numeric("coolant_temp", { precision: 10, scale: 2 }).notNull(),
  oilPressure: numeric("oil_pressure", { precision: 10, scale: 2 }).notNull(),
  batteryVoltage: numeric("battery_voltage", { precision: 10, scale: 2 }).notNull(),
  turboBoost: numeric("turbo_boost", { precision: 10, scale: 2 }).notNull(),
  brakeWear: numeric("brake_wear", { precision: 10, scale: 2 }).notNull(),
  exhaustTemp: numeric("exhaust_temp", { precision: 10, scale: 2 }).notNull(),
  fuelLevel: numeric("fuel_level", { precision: 10, scale: 2 }).notNull(),
  speed: numeric("speed", { precision: 10, scale: 2 }).notNull(),
  mileage: numeric("mileage", { precision: 10, scale: 2 }).notNull()
})

export const serviceRequests = pgTable("service_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  vehicleId: varchar("vehicle_id", { length: 64 }).notNull(),
  depotId: varchar("depot_id", { length: 64 }),
  technicianId: varchar("technician_id", { length: 64 }),
  weakestSubsystem: text("weakest_subsystem").notNull(),
  priorityScore: numeric("priority_score", { precision: 6, scale: 2 }).notNull(),
  status: text("status").notNull(),
  requiredPartNumbers: jsonb("required_part_numbers").notNull(),
  timeline: jsonb("timeline").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true })
})
