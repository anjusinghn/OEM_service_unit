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
    "id" TEXT NOT NULL,
    "depot_id" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorder_point" INTEGER NOT NULL DEFAULT 2,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "part_reservations" (
    "id" TEXT NOT NULL,
    "service_request_id" TEXT NOT NULL,
    "part_number" TEXT NOT NULL,
    "depot_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "ReservationStatus" NOT NULL DEFAULT 'HELD',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "part_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "depot_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "current_load" INTEGER NOT NULL DEFAULT 0,
    "max_load" INTEGER NOT NULL DEFAULT 5,
    "first_time_fix_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.85,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priority_entries" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "safety_urgency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "failure_proximity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "business_impact" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downtime_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "service_window" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL DEFAULT '[]',
    "is_overridden" BOOLEAN NOT NULL DEFAULT false,
    "overridden_by" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "priority_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "priority_score" DOUBLE PRECISION NOT NULL,
    "weakest_subsystem" TEXT NOT NULL,
    "depot_id" TEXT,
    "technician_id" TEXT,
    "required_part_numbers" JSONB NOT NULL DEFAULT '[]',
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'DETECTED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "scheduled_for" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_timeline" (
    "id" TEXT NOT NULL,
    "service_request_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_history" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "depot_id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "subsystem" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "resolved_at" TIMESTAMPTZ NOT NULL,
    "first_time_fix" BOOLEAN NOT NULL DEFAULT true,
    "actual_fault" TEXT,
    "parts_used" JSONB NOT NULL DEFAULT '[]',
    "repair_duration_hours" DOUBLE PRECISION,
    "diagnosis_correct" BOOLEAN,
    "technician_notes" TEXT,

    CONSTRAINT "service_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_tracking" (
    "id" TEXT NOT NULL,
    "service_request_id" TEXT NOT NULL,
    "detected_at" TIMESTAMPTZ NOT NULL,
    "assigned_at" TIMESTAMPTZ,
    "service_started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "detection_to_assign_ms" INTEGER,
    "assign_to_start_ms" INTEGER,
    "start_to_complete_ms" INTEGER,
    "total_resolution_ms" INTEGER,
    "breached" BOOLEAN NOT NULL DEFAULT false,
    "breach_reason" TEXT,

    CONSTRAINT "sla_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forensics_cohorts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "dimension_value" TEXT NOT NULL,
    "vehicle_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forensics_cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_members" (
    "id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,

    CONSTRAINT "cohort_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_comparisons" (
    "id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "baseline_label" TEXT NOT NULL,
    "overall_fault_rate" DOUBLE PRECISION NOT NULL,
    "baseline_overall_fault_rate" DOUBLE PRECISION NOT NULL,
    "avg_health_score" DOUBLE PRECISION NOT NULL,
    "baseline_avg_health_score" DOUBLE PRECISION NOT NULL,
    "statistical_significance" DOUBLE PRECISION NOT NULL,
    "is_significant" BOOLEAN NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "fault_profiles" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohort_anomalies" (
    "id" TEXT NOT NULL,
    "cohort_id" TEXT NOT NULL,
    "anomaly_type" TEXT NOT NULL,
    "dtc_code" TEXT NOT NULL,
    "subsystem" TEXT NOT NULL,
    "rate_ratio" DOUBLE PRECISION NOT NULL,
    "p_value" DOUBLE PRECISION NOT NULL,
    "affected_vehicle_count" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cohort_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forensics_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ForensicsPatternStatus" NOT NULL DEFAULT 'DETECTED',
    "confidence" DOUBLE PRECISION NOT NULL,
    "support_count" INTEGER NOT NULL,
    "total_vehicles" INTEGER NOT NULL,
    "support_rate" DOUBLE PRECISION NOT NULL,
    "sequence" JSONB NOT NULL DEFAULT '[]',
    "affected_subsystems" JSONB NOT NULL DEFAULT '[]',
    "affected_regions" JSONB NOT NULL DEFAULT '[]',
    "correlations" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL,
    "detected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forensics_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forensics_investigations" (
    "id" TEXT NOT NULL,
    "pattern_id" TEXT,
    "title" TEXT NOT NULL,
    "status" "ForensicsInvestigationStatus" NOT NULL DEFAULT 'PATTERN_DETECTED',
    "root_cause" TEXT,
    "affected_vehicle_ids" JSONB NOT NULL DEFAULT '[]',
    "affected_vehicle_count" INTEGER NOT NULL,
    "containment" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "forensics_investigations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forensics_investigation_events" (
    "id" TEXT NOT NULL,
    "investigation_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forensics_investigation_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_info" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "component_types" JSONB NOT NULL DEFAULT '[]',
    "active_batches" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_info_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_scorecards" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "component_type" TEXT NOT NULL,
    "overall_fault_rate" DOUBLE PRECISION NOT NULL,
    "baseline_fault_rate" DOUBLE PRECISION NOT NULL,
    "rate_ratio" DOUBLE PRECISION NOT NULL,
    "trend" TEXT NOT NULL,
    "affected_vehicle_count" INTEGER NOT NULL,
    "total_vehicle_count" INTEGER NOT NULL,
    "batches" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "supplier_scorecards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
