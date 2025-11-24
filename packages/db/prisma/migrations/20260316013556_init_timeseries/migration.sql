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
