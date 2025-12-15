CREATE EXTENSION IF NOT EXISTS timescaledb;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLATFORM_ADMIN', 'OEM_ADMIN', 'DEPOT_MANAGER', 'TECHNICIAN', 'VIEWER');

-- CreateEnum
CREATE TYPE "OemConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'SYNCING');

-- CreateEnum
CREATE TYPE "DtcSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'SAFETY');

-- CreateEnum
CREATE TYPE "Subsystem" AS ENUM ('ENGINE', 'COOLING', 'BRAKES', 'ELECTRICAL', 'EXHAUST', 'TURBO', 'FUEL', 'TRANSMISSION', 'STEERING', 'SUSPENSION', 'BODY');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED');

-- CreateEnum
CREATE TYPE "BayType" AS ENUM ('GENERAL', 'ENGINE', 'ELECTRICAL', 'BODY', 'INSPECTION', 'EV');

-- CreateEnum
CREATE TYPE "BayStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('DETECTED', 'PRIORITIZED', 'DEPOT_ASSIGNED', 'PARTS_CONFIRMED', 'TECHNICIAN_ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ForensicsPatternStatus" AS ENUM ('DETECTED', 'UNDER_REVIEW', 'CONFIRMED', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ForensicsInvestigationStatus" AS ENUM ('PATTERN_DETECTED', 'INVESTIGATION_OPENED', 'EVIDENCE_COLLECTED', 'ROOT_CAUSE_IDENTIFIED', 'CONTAINMENT_RECOMMENDED', 'ACTION_TAKEN', 'VERIFIED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oem_connections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "adapter_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "status" "OemConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "last_sync_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oem_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "vin" VARCHAR(32) NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "build_batch" TEXT NOT NULL,
    "software_version" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "route_name" TEXT NOT NULL,
    "cargo_priority" INTEGER NOT NULL DEFAULT 50,
    "route_criticality" INTEGER NOT NULL DEFAULT 50,
    "downtime_cost_per_hour" INTEGER NOT NULL DEFAULT 1000,
    "next_stop_hours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depot_affinity_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,
    "source_system" TEXT,
    "normalization" JSONB,

    CONSTRAINT "signal_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_signals" (
    "vehicle_id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "coolant_temp" DOUBLE PRECISION NOT NULL,
    "oil_pressure" DOUBLE PRECISION NOT NULL,
    "battery_voltage" DOUBLE PRECISION NOT NULL,
    "turbo_boost" DOUBLE PRECISION NOT NULL,
    "brake_wear" DOUBLE PRECISION NOT NULL,
    "exhaust_temp" DOUBLE PRECISION NOT NULL,
    "fuel_level" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "mileage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "vehicle_signals_pkey" PRIMARY KEY ("vehicle_id","timestamp")
);

-- CreateTable
CREATE TABLE "vehicle_health_snapshots" (
    "vehicle_id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "health_score" DOUBLE PRECISION NOT NULL,
    "risk_level" TEXT NOT NULL,
    "subsystem_scores" JSONB NOT NULL DEFAULT '{}',
    "fault_breakdown" JSONB NOT NULL DEFAULT '{}',
    "signal_breakdown" JSONB,

    CONSTRAINT "vehicle_health_snapshots_pkey" PRIMARY KEY ("vehicle_id","timestamp")
);

-- CreateTable
CREATE TABLE "priority_snapshots" (
    "vehicle_id" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "score_breakdown" JSONB NOT NULL DEFAULT '{}',
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "override_breakdown" JSONB,

    CONSTRAINT "priority_snapshots_pkey" PRIMARY KEY ("vehicle_id","timestamp")
);

-- CreateTable
CREATE TABLE "vehicle_events" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "dtc_code" TEXT,
    "severity" "DtcSeverity" NOT NULL DEFAULT 'INFO',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "timestamp" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dtc_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "subsystem" "Subsystem" NOT NULL,
    "severity" "DtcSeverity" NOT NULL DEFAULT 'INFO',
    "description" TEXT NOT NULL,
    "known_causes" TEXT[],
    "remedies" TEXT[],
    "related_codes" TEXT[],

    CONSTRAINT "dtc_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_faults" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "dtc_code" TEXT NOT NULL,
    "subsystem" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicle_faults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subsystem" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "status" "AlertStatus" NOT NULL DEFAULT 'NEW',
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialties" JSONB NOT NULL DEFAULT '[]',
    "total_bays" INTEGER NOT NULL,
    "occupied_bays" INTEGER NOT NULL DEFAULT 0,
    "operating_hours" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bays" (
    "id" TEXT NOT NULL,
    "depot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BayType" NOT NULL DEFAULT 'GENERAL',
    "status" "BayStatus" NOT NULL DEFAULT 'AVAILABLE',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parts" (
    "part_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subsystem" TEXT NOT NULL,
    "lead_days" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criticality" TEXT NOT NULL DEFAULT 'operational',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parts_pkey" PRIMARY KEY ("part_number")
);

-- CreateTable
CREATE TABLE "part_substitutes" (
    "id" TEXT NOT NULL,
    "original_part_number" TEXT NOT NULL,
    "substitute_part_number" TEXT NOT NULL,

    CONSTRAINT "part_substitutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
