# KAZINDUSTRIES — Service Orchestration: Production Architecture & Build Plan

## AI-Driven OEM Aftersales Service Orchestration Platform

> **Scope:** Full implementation of the **Service Orchestration Unit** — from the current
> in-memory demo to a production-grade, AI-powered, enterprise-level platform.
>
> **Not in scope:** Forensics and Predictive Warranty Shield. A handoff note at the end
> describes how to begin those modules once orchestration is production-ready.

---

## Table of Contents

1. [Current State Assessment](#current-state-assessment)
2. [Production Architecture Blueprint](#production-architecture-blueprint)
3. [OEM Cloud Data Flow — How Telemetry Reaches Us](#oem-cloud-data-flow)
4. [OpenRouter AI Integration Architecture](#openrouter-ai-integration-architecture)
5. [Enterprise Dashboard Architecture (shadcn/ui)](#enterprise-dashboard-architecture)
6. [Authentication & Authorization](#authentication--authorization)
7. [Phase-by-Phase Build Plan](#phase-by-phase-build-plan)
8. [What Comes Next](#what-comes-next)
9. [Risk Register](#risk-register)
10. [Key Principles](#key-principles)

---

## Current State Assessment

### What Exists (Working In-Memory Demo)

| Layer | Implementation | Lines | Status |
|---|---|---|---|
| **Monorepo scaffold** | Turborepo + pnpm, Express API, Next.js web, worker stub, simulator stub | — | ✅ |
| **Shared types** | Full TypeScript type system — vehicles, signals, faults, depots, technicians, service requests, health scores | ~605 | ✅ |
| **OEM Mock Adapter** | 96-vehicle fleet, deterministic PRNG, signal degradation, fault injection, 12s tick cycle | ~374 | ✅ |
| **Signal Trust** | `computeHealthScore()` — 8-subsystem scoring, fault severity weighting, trend detection, `dedupeAlerts()` | ~75 | ✅ |
| **Priority Engine** | 5-factor weighted scoring (safety 30%, failure 25%, business 20%, downtime 15%, window 10%) | — | ✅ |
| **Depot Matching** | Specialty match (+35), parts availability (+30), capacity (+7/bay), distance penalty (-0.45/km) | — | ✅ |
| **Technician Assignment** | Skill match (+44), first-time-fix rate weighting, workload capacity, top 3 recommendations | — | ✅ |
| **Service Workflow** | Full state machine: DETECTED → PRIORITIZED → DEPOT_ASSIGNED → … → COMPLETED → CLOSED | — | ✅ |
| **Dashboard** | Single-file 674-line Next.js dashboard, custom CSS, SSE streaming, Lucide icons | ~674 | ✅ |
| **API** | 25+ REST endpoints + SSE live stream | ~645 | ✅ |

### Critical Gaps

| Gap | Severity | Impact |
|---|---|---|
| Everything is in-memory (`DemoStore`) | 🔴 Critical | State vanishes on restart. Zero persistence |
| No real database | 🔴 Critical | No PostgreSQL, TimescaleDB, or Redis |
| No Docker Compose | 🟡 High | Cannot spin up local infra with one command |
| Worker is an 8-line stub | 🟡 High | No background job processing — everything blocks the API thread |
| Simulator exits after one log | 🟡 High | No continuous telemetry streaming |
| No auth | 🔴 Critical | Anyone can access everything. No login, no RBAC |
| No AI/ML in decisions | 🟡 High | Pure heuristic scoring — no learning, no LLM reasoning, no explanations |
| No RL feedback loop | 🟡 High | Completed services don't improve future decisions |
| Dashboard is a single file | 🟡 High | 674 lines, no component library, no design system, plain CSS |
| No OEM cloud integration | 🟡 High | Only mock adapter — no real telemetry ingestion path |
| Zero tests | 🟡 High | No unit, integration, or E2E tests |
| No CI/CD | 🟡 Medium | No automated pipeline |
| No cloud infrastructure | 🟡 Medium | No Terraform, no Azure |

---

## Production Architecture Blueprint

### System Architecture (30,000-Foot View)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           OEM TELEMATICS CLOUDS                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Tata CV  │  │ Ashok    │  │ Mahindra │  │ Eicher   │  │ Mock Simulator   │  │
│  │ Fleet    │  │ Leyland  │  │ Truck &  │  │ (VECV)   │  │ (Dev/Staging)    │  │
│  │ Edge     │  │ iAlert   │  │ Bus      │  │          │  │                  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │              │              │                 │            │
│       ▼              ▼              ▼              ▼                 ▼            │
│  ┌──────────────────────────────────────────────────────────────────────────┐    │
│  │                    OEM ADAPTER LAYER (@kaz/oem-adapters)                 │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │    │
│  │  │ REST Poller │ │ MQTT Sub   │ │ Webhook Rx  │ │ Mock Generator   │  │    │
│  │  │ (pull)      │ │ (push)     │ │ (push)      │ │ (dev/test)       │  │    │
│  │  └──────┬──────┘ └──────┬─────┘ └──────┬──────┘ └──────┬───────────┘  │    │
│  │         └───────────────┴───────────────┴───────────────┘              │    │
│  │                              │                                         │    │
│  │                     Normalized Signal Format                           │    │
│  └──────────────────────────────┬────────────────────────────────────────┘    │
└─────────────────────────────────┼───────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        INGESTION GATEWAY (apps/api)                             │
│                                                                                 │
│  POST /api/v1/ingest/signals    ← Adapter pushes normalized signals             │
│  POST /api/v1/ingest/faults     ← Adapter pushes fault events                   │
│  POST /api/v1/ingest/batch      ← Bulk signal ingestion (up to 1000/request)    │
│  POST /api/v1/webhooks/oem/:id  ← Direct OEM webhook receiver                  │
│                                                                                 │
│  ┌─────────────────┐   Auth: API key per OEM connection                        │
│  │ Zod Validation  │   Rate limit: per-key, per-endpoint                       │
│  │ + Normalization │   Deduplication: signal hash → Redis SET (5min TTL)         │
│  └────────┬────────┘                                                            │
│           │                                                                     │
│           ▼                                                                     │
│  ┌─────────────────────────────────────────────────┐                           │
│  │           BullMQ Job Queues (Redis-backed)        │                           │
│  │                                                   │                           │
│  │  queue:telemetry-ingest    (concurrency: 10)     │                           │
│  │  queue:fault-events        (concurrency: 5)      │                           │
│  │  queue:health-recompute    (concurrency: 5)      │                           │
│  │  queue:priority-rerank     (concurrency: 2)      │                           │
│  │  queue:ai-reasoning        (concurrency: 3)      │                           │
│  │  queue:depot-match         (concurrency: 3)      │                           │
│  │  queue:tech-match          (concurrency: 3)      │                           │
│  │  queue:notifications       (concurrency: 2)      │                           │
│  └────────────────────┬────────────────────────────┘                           │
└───────────────────────┼─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       WORKER CLUSTER (apps/worker)                              │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                         PROCESSING PIPELINE                              │   │
│  │                                                                          │   │
│  │  SignalIngestProcessor                                                   │   │
│  │  ├─ Write signal snapshot → TimescaleDB (vehicle_signals hypertable)     │   │
│  │  ├─ Update Redis cache (vehicle:signal:{id}, TTL 60s)                    │   │
│  │  └─ Emit job → queue:health-recompute                                    │   │
│  │                                                                          │   │
│  │  FaultProcessor                                                          │   │
│  │  ├─ Upsert fault in PostgreSQL (vehicle_faults table)                    │   │
│  │  ├─ Run dedupeAlerts() for consolidation                                 │   │
│  │  └─ Emit job → queue:health-recompute                                    │   │
│  │                                                                          │   │
│  │  HealthProcessor                                                         │   │
│  │  ├─ Run computeHealthScore() (existing signal-trust logic)               │   │
│  │  ├─ Write health snapshot → TimescaleDB (vehicle_health_snapshots)       │   │
│  │  ├─ Update Redis cache (vehicle:health:{id}, TTL 60s)                    │   │
│  │  ├─ Compare with previous score → detect status change events            │   │
│  │  └─ Emit job → queue:priority-rerank                                     │   │
│  │                                                                          │   │
│  │  PriorityProcessor                                                       │   │
│  │  ├─ Run buildPriorityQueue() for affected vehicles (existing logic)      │   │
│  │  ├─ Update Redis sorted set (queue:priority)                             │   │
│  │  ├─ Write priority snapshot → TimescaleDB (priority_snapshots)           │   │
│  │  ├─ Emit job → queue:ai-reasoning (for top 20 vehicles)                  │   │
│  │  └─ Emit job → queue:depot-match + queue:tech-match (top 16)             │   │
│  │                                                                          │   │
│  │  AIReasoningProcessor                                                    │   │
│  │  ├─ Call OpenRouter via LangChain (priority reasoning chain)             │   │
│  │  ├─ Store AI assessment alongside heuristic score in PostgreSQL          │   │
│  │  ├─ Cache AI response in Redis (ai:priority:{vehicleId}, TTL 300s)       │   │
│  │  └─ Publish event → Redis pub/sub channel                                │   │
│  │                                                                          │   │
│  │  DepotMatchProcessor                                                     │   │
│  │  ├─ Run recommendDepots() (existing heuristic logic)                     │   │
│  │  ├─ Optionally augment with AI depot reasoning chain                     │   │
│  │  └─ Cache in Redis (vehicle:depot-match:{id}, TTL 120s)                  │   │
│  │                                                                          │   │
│  │  TechMatchProcessor                                                      │   │
│  │  ├─ Run recommendTechnicians() (existing heuristic logic)                │   │
│  │  ├─ Optionally augment with AI technician reasoning chain                │   │
│  │  └─ Cache in Redis (vehicle:tech-match:{id}, TTL 120s)                   │   │
│  │                                                                          │   │
│  │  NotificationProcessor                                                   │   │
│  │  ├─ Build SSE payload → publish to Redis pub/sub (channel:dashboard)     │   │
│  │  ├─ Send webhook to registered endpoints                                 │   │
│  │  └─ Store in notification_log table                                      │   │
│  │                                                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────┐    ┌──────────────────────┐
│  PostgreSQL 16    │    │  Redis 7             │
│  + TimescaleDB    │    │                      │
│                   │    │  • Priority sorted   │
│  • vehicles       │    │    set               │
│  • depots         │    │  • Health cache      │
│  • technicians    │    │  • Signal cache      │
│  • parts_catalog  │    │  • AI response cache │
│  • depot_inventory│    │  • Session store     │
│  • service_reqs   │    │  • BullMQ backing    │
│  • service_history│    │  • Pub/sub channels  │
│  • decision_logs  │    │  • Dispatch locks    │
│  • vehicle_faults │    │  • Rate limit        │
│  • reward_signals │    │    counters          │
│                   │    │                      │
│  HYPERTABLES:     │    └──────────────────────┘
│  • vehicle_signals│
│  • health_snapshots│
│  • priority_snaps │
└───────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          API SERVER (apps/api)                                   │
│                                                                                 │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth       │  │ REST Routes  │  │ SSE Stream   │  │ Bull Board           │  │
│  │ Middleware │  │ (Express)    │  │ Engine       │  │ /admin/queues        │  │
│  │            │  │              │  │              │  │                      │  │
│  │ NextAuth   │  │ /vehicles    │  │ Subscribes   │  │ Job monitoring       │  │
│  │ JWT verify │  │ /orchestr..  │  │ to Redis     │  │ dashboard            │  │
│  │ RBAC check │  │ /depots      │  │ pub/sub      │  │                      │  │
│  │ Org scope  │  │ /service-..  │  │ channels     │  │ (protected by        │  │
│  │            │  │ /ai          │  │ and pushes   │  │  platform_admin      │  │
│  │            │  │ /analytics   │  │ to connected │  │  role)               │  │
│  │            │  │ /admin       │  │ SSE clients  │  │                      │  │
│  └────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                                 │
│  HOT-PATH READS: Redis first → PostgreSQL fallback                             │
│  WRITES: PostgreSQL (source of truth) → invalidate Redis cache                 │
│  SSE: Redis pub/sub → fan-out to all connected browser clients                 │
└────────────────────────────────┬────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE DASHBOARD (apps/web)                               │
│                                                                                 │
│  Next.js 14 App Router + shadcn/ui + Tailwind CSS + Recharts + Framer Motion   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                        PAGE ARCHITECTURE                                │    │
│  │                                                                         │    │
│  │  /login              → Auth page (NextAuth.js)                          │    │
│  │  /                   → Fleet Command Center (overview)                  │    │
│  │  /triage             → AI Priority Queue + Reasoning Panel              │    │
│  │  /triage/[vehicleId] → Vehicle Deep Dive                                │    │
│  │  /dispatch           → AI Dispatch Agent Interface                      │    │
│  │  /workflow           → Service Request Kanban Board                     │    │
│  │  /depots             → Depot Network Map + Capacity                     │    │
│  │  /depots/[depotId]   → Depot Detail (bays, techs, inventory)            │    │
│  │  /technicians        → Technician Roster + Workload                     │    │
│  │  /intelligence       → Decision Intelligence + RL Dashboard             │    │
│  │  /alerts             → Alert Feed + Escalations                         │    │
│  │  /settings           → Org settings, weights, API keys, users           │    │
│  │                                                                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  REAL-TIME: SSE EventSource → Zustand store → React re-render                  │
│  MUTATIONS: React Query useMutation → optimistic updates → SSE confirmation    │
│  CHARTS: Recharts (line, area, bar, radar, pie) + custom gauges                │
│  ANIMATIONS: Framer Motion for transitions, list reordering, modals            │
│  MAPS: Leaflet or Mapbox GL JS for fleet/depot geographic views                │
│  THEME: Dark/light mode toggle, persisted in localStorage                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack (Locked)

| Layer | Technology | Version | Rationale |
|---|---|---|---|
| **Language** | TypeScript | 5.x | Full-stack consistency |
| **Runtime** | Node.js | 22 LTS | Stable, async-first |
| **API** | Express.js | 4.x | Already in use, proven |
| **Frontend** | Next.js (App Router) | 15.x | Already in use |
| **UI Components** | **shadcn/ui** | latest | Radix primitives + Tailwind, fully customizable, not a dependency — you own the code |
| **Styling** | **Tailwind CSS** | 3.x | Utility-first, works perfectly with shadcn/ui |
| **Charts** | **Recharts** | 2.x | React-native charting, composable, supports animations |
| **Animations** | **Framer Motion** | 11.x | Layout animations, list reordering, route transitions |
| **Maps** | **Leaflet** + react-leaflet | 1.9 / 4.x | Free, no API key needed, perfect for fleet/depot visualization |
| **State (client)** | **Zustand** | 5.x | Tiny, fast, SSE-friendly global state management |
| **Data fetching** | **TanStack Query** (React Query) | 5.x | Caching, optimistic updates, retry, background refetch |
| **Forms** | **React Hook Form** + Zod | 7.x | Performant forms with schema validation |
| **Icons** | **Lucide React** | latest | Already in use, 1500+ icons |
| **DB** | PostgreSQL 16 + TimescaleDB | 16 / 2.x | Relational + time-series in one engine |
| **Cache** | Redis | 7.x | Hot path, pub/sub, BullMQ backing store, sessions |
| **Job Queue** | BullMQ | 5.x | Reliable background processing with retry, DLQ, concurrency |
| **ORM** | Prisma | 6.x | Schema-first, type-safe, migration management |
| **AI Framework** | **LangChain.js** | 0.3.x | LLM orchestration, tool-calling agents, structured output |
| **LLM** | **OpenRouter `z-ai/glm-4.5-air:free`** | latest | OpenAI-compatible API routing with a free model suitable for Phase 3 development |
| **Auth** | **NextAuth.js** (Auth.js v5) | 5.x | Session management, JWT, provider extensibility |
| **Monorepo** | Turborepo + pnpm | latest | Already in use |
| **Container** | Docker + Docker Compose | latest | Local dev infra, production images |
| **Cloud** | Microsoft Azure | — | AKS, Azure DB for PG, Azure Cache for Redis |
| **IaC** | Terraform | 1.x | Azure infrastructure provisioning |
| **CI/CD** | GitHub Actions | — | Automated lint, test, build, deploy |

---

## OEM Cloud Data Flow

### How Telemetry Gets From a Vehicle to Our Dashboard

This is the real-world data path. Every OEM telematics system follows the same general pattern, even though the specifics differ.

```
VEHICLE (on-road)
│
│  TCU (Telematics Control Unit) embedded in vehicle
│  Collects: CAN bus signals, GPS, DTC codes, driver behavior
│  Transmits: MQTT / cellular (4G/5G) every 10-60 seconds
│
▼
OEM TELEMATICS CLOUD (their infrastructure, not ours)
│
│  Examples:
│  • Tata Motors Fleet Edge (connected.tatamotors.com)
│  • Ashok Leyland iAlert (ialert.ashokleyland.com)
│  • Mahindra DiGiSENSE
│  • Eicher LIVE (VECV)
│  • BharatBenz Truckonnect (Daimler India)
│  • Volvo Dynafleet
│  • VW Rio/MAN (later)
│
│  What they store:
│  • GPS position + speed + heading
│  • Engine parameters (RPM, coolant temp, oil pressure, fuel level)
│  • Diagnostic Trouble Codes (DTCs)
│  • Trip summaries
│  • Driver behavior events (harsh braking, speeding)
│  • Vehicle health alerts
│
│  How they expose it (3 common patterns):
│
├──── PATTERN A: REST API (Pull-based) ────────────────────────
│     Most common. OEM provides a REST API with OAuth2 auth.
│     We poll at intervals (every 30s–5min depending on SLA).
│     Example: GET /api/vehicles/{vin}/signals?since={timestamp}
│     Pagination, rate limits, API key management required.
│
├──── PATTERN B: MQTT Broker (Push-based, real-time) ──────────
│     OEM publishes signals to an MQTT topic per vehicle/fleet.
│     We subscribe to topics: oem/{fleetId}/vehicles/{vin}/signals
│     Lowest latency. Best for real-time health monitoring.
│     Requires persistent MQTT client connection management.
│
├──── PATTERN C: Webhook (Push-based, event-driven) ───────────
│     OEM sends HTTP POST to our endpoint when events occur
│     (new DTC, health alert, trip completed, geofence breach).
│     Best for fault events and alerts. Not for continuous signals.
│     Requires webhook registration, signature verification.
│
└──── PATTERN D: File-based / Batch ───────────────────────────
      OEM drops CSV/JSON files to SFTP or cloud storage daily.
      Least common for real-time, but some legacy OEMs use this.
      We poll storage, parse, and ingest in batch jobs.
```

### Our OEM Adapter Architecture

```
packages/oem-adapters/
├── core/
│   └── src/
│       ├── index.ts              # Abstract OEMAdapter interface
│       ├── types.ts              # RawSignal, RawFault, RawVehicle, OEMConfig
│       ├── normalizer.ts         # Normalize any OEM format → our standard format
│       ├── rate-limiter.ts       # Per-OEM rate limit tracking
│       └── health-check.ts      # Connection health monitoring
│
├── mock/                         # EXISTING — enhanced for continuous streaming
│   └── src/index.ts             # Mock OEM that generates realistic telemetry
│
├── rest-poller/                  # Generic REST API adapter (Pattern A)
│   └── src/
│       ├── index.ts             # Polling loop: fetch → normalize → push to queue
│       ├── auth.ts              # OAuth2 client credentials flow
│       └── pagination.ts       # Cursor/offset pagination handling
│
├── mqtt-subscriber/              # Generic MQTT adapter (Pattern B)
│   └── src/
│       ├── index.ts             # MQTT.js client: connect, subscribe, handle messages
│       ├── topic-router.ts      # Route messages by topic pattern to correct handler
│       └── reconnect.ts        # Exponential backoff reconnection logic
│
└── webhook-receiver/             # Generic Webhook adapter (Pattern C)
    └── src/
        ├── index.ts             # Express sub-router mounted on API server
        ├── signature.ts         # HMAC signature verification per OEM
        └── transform.ts        # OEM-specific payload → normalized format
```

### The OEM Adapter Interface (Production Version)

```typescript
// packages/oem-adapters/core/src/types.ts

interface OEMConfig {
  oemId: string                    // "tata_fleet_edge" | "ashok_leyland_ialert" | ...
  connectionType: "rest" | "mqtt" | "webhook" | "mock"
  credentials: {
    apiKey?: string
    clientId?: string
    clientSecret?: string
    tokenUrl?: string
    mqttBrokerUrl?: string
    mqttUsername?: string
    mqttPassword?: string
    webhookSecret?: string
  }
  pollIntervalMs?: number          // For REST adapters (default: 30000)
  batchSize?: number               // For REST adapters (default: 100)
  topicPattern?: string            // For MQTT adapters
  signalMapping: SignalMapping     // OEM field names → our field names
}

interface SignalMapping {
  coolantTemp: string              // e.g., "engine.coolant_temperature_celsius"
  oilPressure: string              // e.g., "engine.oil_pressure_kpa"
  batteryVoltage: string           // e.g., "electrical.battery_voltage"
  turboBoost: string               // e.g., "engine.turbo_boost_bar"
  brakeWear: string                // e.g., "chassis.brake_pad_wear_percent"
  exhaustTemp: string              // e.g., "exhaust.gas_temperature_celsius"
  fuelLevel: string                // e.g., "fuel.level_percent"
  speed: string                    // e.g., "motion.speed_kmh"
  mileage: string                  // e.g., "odometer.total_km"
  latitude: string                 // e.g., "gps.latitude"
  longitude: string                // e.g., "gps.longitude"
}

// What comes out of normalization — OEM-agnostic
interface NormalizedSignal {
  vehicleId: string                // Our internal ID (mapped from VIN)
  vin: string                      // Original VIN from OEM
  timestamp: string                // ISO 8601
  coolantTemp: number              // Always Celsius
  oilPressure: number              // Always kPa
  batteryVoltage: number           // Always Volts
  turboBoost: number               // Always bar
  brakeWear: number                // Always 0-100%
  exhaustTemp: number              // Always Celsius
  fuelLevel: number                // Always 0-100%
  speed: number                    // Always km/h
  mileage: number                  // Always km
  coordinates: { lat: number; lng: number }
  source: string                   // OEM adapter ID
  rawHash: string                  // SHA-256 of raw payload for dedup
}

interface NormalizedFault {
  vehicleId: string
  vin: string
  dtcCode: string                  // ISO 15031 format (P0420, C1234, etc.)
  severity: "info" | "warning" | "critical" | "safety"
  subsystem: SubsystemKey
  title: string
  description: string
  occurredAt: string
  source: string
}

interface OEMAdapter {
  name: string
  connectionType: OEMConfig["connectionType"]

  // Lifecycle
  initialize(config: OEMConfig): Promise<void>
  start(): Promise<void>           // Begin polling/subscribing
  stop(): Promise<void>            // Graceful shutdown
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; lastDataAt: string }>

  // Events — adapter emits these, ingestion gateway consumes them
  on(event: "signals", handler: (signals: NormalizedSignal[]) => void): void
  on(event: "faults", handler: (faults: NormalizedFault[]) => void): void
  on(event: "error", handler: (error: Error) => void): void
  on(event: "connected" | "disconnected", handler: () => void): void
}
```

### Data Flow Sequence (Signal → Dashboard Update)

```
1. OEM cloud has new signal data for VEH-042 (coolant temp spiked to 104°C)

2. OEM Adapter (REST Poller or MQTT Subscriber) receives the raw data
   ├─ Normalizes: OEM "engine.coolant_temperature_celsius" → our "coolantTemp"
   ├─ Unit converts if needed (some OEMs report in Fahrenheit)
   ├─ Dedup check: SHA-256 hash → Redis SET lookup → not a duplicate
   └─ Pushes normalized signal to BullMQ queue:telemetry-ingest

3. Worker: SignalIngestProcessor picks up the job
   ├─ Writes to TimescaleDB: INSERT INTO vehicle_signals (...)
   ├─ Updates Redis: SET vehicle:signal:VEH-042 {json} EX 60
   └─ Emits job → queue:health-recompute { vehicleId: "VEH-042" }

4. Worker: HealthProcessor picks up the job
   ├─ Reads latest signal from Redis (or TimescaleDB fallback)
   ├─ Reads active faults from PostgreSQL
   ├─ Runs computeHealthScore() → overall: 52.3, status: "critical"
   ├─ Compares with previous: was "watch" (67.1) → now "critical" (52.3) = STATUS CHANGE
   ├─ Writes to TimescaleDB: INSERT INTO vehicle_health_snapshots (...)
   ├─ Updates Redis: SET vehicle:health:VEH-042 {json} EX 60
   └─ Emits job → queue:priority-rerank { vehicleId: "VEH-042", statusChanged: true }

5. Worker: PriorityProcessor picks up the job
   ├─ Runs buildPriorityQueue() for VEH-042 → score: 78.4 (was 52.1)
   ├─ Updates Redis sorted set: ZADD queue:priority 78.4 VEH-042
   ├─ Vehicle jumped from position #31 to position #5 in the queue
   ├─ Writes to TimescaleDB: INSERT INTO priority_snapshots (...)
   ├─ Emits job → queue:ai-reasoning { vehicleId: "VEH-042" }
   └─ Emits job → queue:depot-match + queue:tech-match { vehicleId: "VEH-042" }

6. Worker: AIReasoningProcessor picks up the job (async, non-blocking)
   ├─ Builds LangChain prompt with vehicle data, health, faults, service history
├─ Calls OpenRouter API: POST https://openrouter.ai/api/v1/chat/completions
│   model: "z-ai/glm-4.5-air:free"
   │   thinking: { type: "disabled" }  (fast mode for real-time decisions)
   │   tools: [vehicle_lookup, service_history, fleet_stats]
   ├─ Parses structured output (Zod schema validation)
   │   {
   │     adjustedScore: 82.1,
   │     urgency: "urgent",
   │     riskFactors: ["Coolant spike to 104°C — 12°C above threshold",
   │                   "This vehicle had cooling intervention 45 days ago — possible recurring issue"],
   │     recommendation: "Immediate dispatch recommended. Prior cooling repair may not have
   │                      addressed root cause. Suggest extended diagnostics at Pune depot."
   │   }
   ├─ Stores AI assessment in PostgreSQL: INSERT INTO decision_logs (...)
   └─ Updates Redis cache: SET ai:priority:VEH-042 {json} EX 300

7. Worker: NotificationProcessor (triggered by status change in step 4)
   ├─ Builds SSE event payload:
   │   {
   │     type: "vehicle_status_change",
   │     vehicleId: "VEH-042",
   │     previousStatus: "watch",
   │     newStatus: "critical",
   │     health: { overall: 52.3, weakestSubsystem: "cooling", ... },
   │     priority: { score: 78.4, rank: 5, aiAssessment: { urgency: "urgent", ... } },
   │     timestamp: "2026-03-16T14:23:45.123Z"
   │   }
   ├─ Publishes to Redis: PUBLISH channel:dashboard {json}
   └─ Sends webhook to registered endpoints (if any)

8. API Server: SSE stream handler
   ├─ Redis subscriber receives the published event
   └─ Fans out to all connected EventSource clients: data: {json}\n\n

9. Dashboard (browser):
   ├─ EventSource receives the SSE event
   ├─ Zustand store updates: vehicles, priorityQueue, healthByVehicle
   ├─ React re-renders:
   │   ├─ VEH-042 card flashes red with pulse animation (Framer Motion)
   │   ├─ Priority queue table re-sorts with layout animation
   │   ├─ VEH-042 slides from position #31 to #5 with smooth transition
   │   ├─ Toast notification: "⚠️ VEH-042 entered CRITICAL status"
   │   ├─ AI assessment badge appears: "🔴 Urgent — recurring cooling issue"
   │   └─ Alert bell icon in header gets a red badge count increment
   └─ Total latency from signal → dashboard update: < 3 seconds

10. User clicks VEH-042 in the priority queue:
    ├─ Vehicle detail panel slides open (Framer Motion)
    ├─ Shows: subsystem radar chart, signal sparklines, fault history
├─ AI reasoning panel expands: full explanation from OpenRouter model output
    └─ "AI Dispatch" button is prominently available
```

---

## OpenRouter AI Integration Architecture

### API Configuration

```
Base URL:     https://openrouter.ai/api/v1
Model:        z-ai/glm-4.5-air:free
Context:      256K tokens
API Style:    OpenAI-compatible (chat/completions endpoint)
Tool Calling: Supported (tools array + tool_choice: "auto")
Thinking:     Disable for real-time decisions (type: "disabled")
              Enable for complex dispatch analysis (type: "enabled")
Pricing:      $0.10/M input (cache hit), $0.60/M input (cache miss), $3.00/M output
```

### Environment Variables

```bash
# Required — OpenRouter API access
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxxxxxxxxx   # From openrouter.ai/keys
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=z-ai/glm-4.5-air:free

# AI behavior configuration
AI_ENABLED=true                              # Feature flag — false = pure heuristic mode
AI_CACHE_TTL_SECONDS=300                     # Cache AI responses for 5 minutes
AI_MAX_RETRIES=3                             # Retry on transient failures
AI_TIMEOUT_MS=15000                          # Max wait per AI call (15 seconds)
AI_THINKING_MODE=disabled                    # "disabled" for fast, "enabled" for deep reasoning
AI_MAX_TOOL_STEPS=8                          # Max tool-calling loop iterations
```

### Package Structure

```
packages/ai/                    @kaz/ai
├── src/
│   ├── index.ts                # Public API — exportAll
│   │
│   ├── client.ts               # LangChain ChatOpenAI configured for OpenRouter
│   │   │
│   │   │  import { ChatOpenAI } from "@langchain/openai"
│   │   │
│   │   │  export const createOpenRouterClient = () => new ChatOpenAI({
│   │   │    openAIApiKey: process.env.OPENROUTER_API_KEY,
│   │   │    configuration: {
│   │   │      baseURL: process.env.OPENROUTER_BASE_URL,
│   │   │    },
│   │   │    modelName: process.env.OPENROUTER_MODEL ?? "z-ai/glm-4.5-air:free",
│   │   │    temperature: 0.6,
│   │   │    maxTokens: 4096,
│   │   │    timeout: 15000,
│   │   │    maxRetries: 3,
│   │   │  })
│   │   │
│   │   └── Includes: retry logic, token tracking, cost calculation, fallback handling
│   │
│   ├── chains/                 # LangChain LCEL chains (each is a focused reasoning pipeline)
│   │   │
│   │   ├── priority-reasoning.ts
│   │   │   │
│   │   │   │  PURPOSE: Evaluate whether the heuristic priority ranking is correct.
│   │   │   │           Detect edge cases, recurring issues, non-obvious risk factors.
│   │   │   │
│   │   │   │  INPUT:
│   │   │   │    vehicle: Vehicle + current signals + active faults + health score
│   │   │   │    heuristicScore: number (from existing buildPriorityQueue)
│   │   │   │    heuristicBreakdown: PriorityBreakdown (existing 5-factor breakdown)
│   │   │   │    serviceHistory: last 10 service records for this vehicle
│   │   │   │    fleetContext: { avgHealth, criticalCount, openRequests, queueDepth }
│   │   │   │
│   │   │   │  SYSTEM PROMPT:
│   │   │   │    "You are a fleet service prioritization expert for commercial vehicles
│   │   │   │     operating in India. You are given a vehicle's telemetry, health scores,
│   │   │   │     fault codes, service history, and a heuristic priority score.
│   │   │   │
│   │   │   │     Your job is to evaluate the heuristic ranking and provide:
│   │   │   │     1. Whether the vehicle should be escalated or de-escalated
│   │   │   │     2. Non-obvious risk factors the heuristics might miss
│   │   │   │     3. A natural language recommendation for the fleet manager
│   │   │   │
│   │   │   │     Consider: recurring failure patterns, seasonal effects (monsoon,
│   │   │   │     extreme heat), route criticality, service history quality, and
│   │   │   │     whether prior repairs actually resolved the underlying issue.
│   │   │   │
│   │   │   │     Be concise. Be specific. Cite actual numbers from the data."
│   │   │   │
│   │   │   │  OUTPUT (Zod-parsed):
│   │   │   │    {
│   │   │   │      adjustedScore: number,          // AI-adjusted priority (0-100)
│   │   │   │      adjustment: number,             // Delta from heuristic
│   │   │   │      urgency: "routine" | "elevated" | "urgent" | "emergency",
│   │   │   │      riskFactors: string[],          // Specific, data-cited risks
│   │   │   │      recommendation: string,         // 2-3 sentence action recommendation
│   │   │   │      confidence: number,             // 0-1
│   │   │   │      shouldEscalate: boolean         // True if human attention needed NOW
│   │   │   │    }
│   │   │   │
│   │   │   └── Uses LangChain: ChatPromptTemplate → openRouterClient → StructuredOutputParser
│   │   │
│   │   ├── depot-reasoning.ts
│   │   │   │
│   │   │   │  PURPOSE: Evaluate heuristic depot recommendations with contextual reasoning.
│   │   │   │           Consider depot performance history, parts supply chain risks,
│   │   │   │           and logistical factors the scoring formula can't capture.
│   │   │   │
│   │   │   │  OUTPUT:
│   │   │   │    {
│   │   │   │      recommendedDepotId: string,
│   │   │   │      rerankedDepots: { depotId, adjustedScore, reasoning }[],
│   │   │   │      partsRisk: string | null,
│   │   │   │      logisticsNote: string | null,
│   │   │   │      confidence: number
│   │   │   │    }
│   │   │   │
│   │   │   └── Enriched with: depot avg turnaround, first-time-fix rate,
│   │   │       recent workload trend, parts stock trend for this fault type
│   │   │
│   │   ├── technician-reasoning.ts
│   │   │   │
│   │   │   │  PURPOSE: Evaluate technician recommendations with performance context.
│   │   │   │
│   │   │   │  OUTPUT:
│   │   │   │    {
│   │   │   │      recommendedTechnicianId: string,
│   │   │   │      reasoning: string,
│   │   │   │      skillGapWarning: string | null,
│   │   │   │      estimatedRepairHours: number,
│   │   │   │      confidence: number
│   │   │   │    }
│   │   │   │
│   │   │   └── Enriched with: tech's history on this exact DTC code,
│   │   │       recent workload (burnout risk), skill gap analysis
│   │   │
│   │   ├── dispatch-reasoning.ts
│   │   │   │
│   │   │   │  PURPOSE: Full dispatch decision — this is a LangChain AGENT
│   │   │   │           that orchestrates a multi-step decision by calling tools.
│   │   │   │
│   │   │   │  AGENT TOOLS:
│   │   │   │    - vehicle_lookup(vehicleId) → full vehicle data
│   │   │   │    - depot_lookup(depotId) → depot + capacity + perf metrics
│   │   │   │    - parts_check(depotId, subsystem) → stock levels
│   │   │   │    - tech_lookup(techId) → profile + perf history
│   │   │   │    - service_history(vehicleId) → last 20 service records
│   │   │   │    - fleet_stats() → fleet health distribution + open requests
│   │   │   │    - similar_cases(subsystem, dtcCode) → past cases with outcomes
│   │   │   │
│   │   │   │  AGENT PROMPT:
│   │   │   │    "You are the service orchestration AI for kazindustries.
│   │   │   │     A vehicle has been flagged for service. Use your tools to
│   │   │   │     gather the information you need, then produce a complete
│   │   │   │     dispatch plan: which depot, which technician, what parts
│   │   │   │     to stage, estimated timeline, and what to watch for.
│   │   │   │     Explain your reasoning at each step."
│   │   │   │
│   │   │   │  OUTPUT:
│   │   │   │    {
│   │   │   │      dispatchPlan: {
│   │   │   │        depotId: string,
│   │   │   │        depotReasoning: string,
│   │   │   │        technicianId: string,
│   │   │   │        techReasoning: string,
│   │   │   │        partsToStage: string[],
│   │   │   │        estimatedRepairHours: number,
│   │   │   │        estimatedTotalCost: number,
│   │   │   │        urgencyLevel: string,
│   │   │   │        watchPoints: string[],    // "Check cooling hose — prior repair may have missed a micro-crack"
│   │   │   │        alternativePlan: { ... } | null
│   │   │   │      },
│   │   │   │      agentTrace: string[],       // Step-by-step reasoning log
│   │   │   │      toolCallCount: number,
│   │   │   │      confidence: number,
│   │   │   │      totalTokensUsed: number
│   │   │   │    }
│   │   │   │
│   │   │   └── Uses LangChain: AgentExecutor with tool-calling, max 8 iterations
│   │   │
│   │   └── escalation-reasoning.ts
│   │       │
│   │       │  PURPOSE: Periodic scan of the queue + pipeline for anomalies
│   │       │           that need human attention. Runs every 5 minutes.
│   │       │
│   │       │  DETECTS:
│   │       │    - SLA breach risk (vehicle in queue too long)
│   │       │    - Batch patterns (multiple vehicles from same build batch degrading)
│   │       │    - Capacity crunch (depot overloaded, no alternative)
│   │       │    - Rapid degradation (health dropping >10 points in 30 minutes)
│   │       │    - Parts shortage developing for a trending fault type
│   │       │    - Technician overload (>80% capacity at a depot)
│   │       │
│   │       │  OUTPUT:
│   │       │    {
│   │       │      escalations: {
│   │       │        type: string,
│   │       │        severity: "info" | "warning" | "critical",
│   │       │        title: string,
│   │       │        description: string,
│   │       │        affectedEntities: string[],
│   │       │        suggestedAction: string
│   │       │      }[]
│   │       │    }
│   │       │
│   │       └── Runs as a scheduled BullMQ repeatable job
│   │
│   ├── tools/                  # LangChain tools (functions the AI agent can call)
│   │   ├── vehicle-lookup.ts    # DynamicTool: fetch vehicle + signals + health + faults
│   │   ├── depot-lookup.ts      # DynamicTool: fetch depot + capacity + performance
│   │   ├── parts-check.ts       # DynamicTool: check parts availability at depot
│   │   ├── tech-lookup.ts       # DynamicTool: fetch technician profile + history
│   │   ├── service-history.ts   # DynamicTool: fetch past services for vehicle
│   │   ├── fleet-stats.ts       # DynamicTool: fleet-wide health/queue statistics
│   │   └── similar-cases.ts    # DynamicTool: find similar past cases and their outcomes
│   │
│   ├── prompts/
│   │   ├── system.ts            # System prompts for each chain
│   │   └── few-shot-bank.ts    # Best/worst decision examples for in-context learning
│   │
│   ├── output-schemas.ts       # Zod schemas for all structured AI outputs
│   │
│   └── utils/
│       ├── token-tracker.ts     # Track token usage per chain, per day, per org
│       ├── cost-calculator.ts   # Calculate cost from token counts
│       ├── cache.ts             # Redis-backed response cache with TTL
│       └── fallback.ts         # Graceful degradation when AI is unavailable
│
├── package.json
└── tsconfig.json
```

### Fallback Strategy (AI Down → System Still Works)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      DECISION FLOW                                   │
│                                                                      │
│   Is AI_ENABLED=true?                                                │
│   ├── NO  → Use heuristic scoring only (existing logic). Done.       │
│   └── YES → Try AI chain:                                            │
│             ├── Success (< 15s) → Merge AI assessment with heuristic │
│             │                     Store both. Show both on dashboard. │
│             ├── Timeout (> 15s) → Use heuristic only for now.        │
│             │                     Queue AI job for retry (3 attempts) │
│             │                     Dashboard shows "AI: pending..."    │
│             └── Error/Rate Limit → Use heuristic only.               │
│                                    Log error. Increment metrics.      │
│                                    Dashboard shows "AI: unavailable"  │
│                                                                      │
│   THE SYSTEM NEVER BLOCKS ON AI. HEURISTICS ARE THE FAST PATH.      │
│   AI IS AN ASYNCHRONOUS ENRICHMENT LAYER.                            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Enterprise Dashboard Architecture

### Design Philosophy

This is NOT a plain text dashboard showing numbers in tables. This is an **operational command center** that a fleet manager uses 8 hours a day. Every pixel must earn its place.

**Design references:**
- Stripe Dashboard (clean hierarchy, excellent data density)
- Linear (keyboard-first, smooth animations, dark mode)
- Vercel Dashboard (real-time updates, status indicators)
- Datadog (operational dashboards, live charts, alerting UX)

### UI Stack

```
shadcn/ui                   Component primitives (Button, Card, Dialog, Sheet,
                            DropdownMenu, Command, Table, Tabs, Badge, Tooltip,
                            Avatar, ScrollArea, Separator, Skeleton, Toast,
                            Popover, Select, Checkbox, Switch, Slider, Form...)

Tailwind CSS               Utility-first styling. Dark mode via class strategy.
                            Custom theme extending shadcn defaults.

Recharts                   Charts: LineChart, AreaChart, BarChart, RadarChart,
                            PieChart, ComposedChart. Custom tooltips, animations.

Framer Motion              Layout animations (list reordering when priority changes),
                            page transitions, modal enter/exit, card interactions,
                            number counters (AnimatedNumber component).

react-leaflet              Fleet map (vehicle pins) + depot map (capacity pins).
                            Custom markers with health-colored badges.

Zustand                    Global state: vehicles, priorityQueue, healthByVehicle,
                            serviceRequests, alerts, aiAssessments, user, theme.
                            Updated by SSE events.

TanStack Query             Server data fetching with caching, optimistic mutations,
                            background refetching, retry, error handling.

React Hook Form + Zod      All forms: service completion, settings, filters,
                            dispatch confirmation, weight adjustment.

Lucide React               Icons throughout (already in use).

cmdk                       Command palette (Cmd+K) for quick navigation,
                            vehicle search, action triggering.

Sonner                     Toast notifications (beautiful, stackable, dismissable).

nuqs                       URL query state (filters, sort, pagination in URL —
                            shareable, bookmarkable dashboard views).
```

### Color System & Theme

```css
/* Light mode */
--background:    hsl(0 0% 100%)        /* White */
--foreground:    hsl(224 71% 4%)        /* Near-black */
--card:          hsl(0 0% 100%)
--muted:         hsl(220 14% 96%)
--accent:        hsl(249 76% 67%)       /* Indigo — primary brand */

/* Status colors (semantic) */
--healthy:       hsl(160 60% 45%)       /* Teal-green */
--watch:         hsl(38 92% 50%)        /* Amber */
--critical:      hsl(346 77% 50%)       /* Rose-red */
--info:          hsl(217 91% 60%)       /* Blue */

/* AI accent */
--ai-glow:       hsl(270 76% 60%)       /* Purple — used for AI badges, borders */
--ai-muted:      hsl(270 76% 60% / 0.08)

/* Dark mode */
--background:    hsl(224 71% 4%)        /* Near-black */
--foreground:    hsl(213 31% 91%)       /* Light gray */
--card:          hsl(224 50% 8%)        /* Slightly lighter than bg */
--muted:         hsl(223 47% 11%)
```

### Page-by-Page Design Specification

---

#### 1. `/login` — Authentication Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ┌──────────────────────┐                     │
│                    │                      │                     │
│                    │   ⬡ kazindustries    │                     │
│                    │                      │                     │
│                    │  ┌────────────────┐  │                     │
│                    │  │ Email          │  │                     │
│                    │  └────────────────┘  │                     │
│                    │  ┌────────────────┐  │                     │
│                    │  │ Password       │  │                     │
│                    │  └────────────────┘  │                     │
│                    │                      │                     │
│                    │  ┌────────────────┐  │                     │
│                    │  │  Sign in    →  │  │                     │
│                    │  └────────────────┘  │                     │
│                    │                      │                     │
│                    │  ── or continue ──   │                     │
│                    │                      │                     │
│                    │  [ Azure AD SSO ]    │                     │
│                    │                      │                     │
│                    └──────────────────────┘                     │
│                                                                 │
│    Background: subtle animated grid pattern (CSS only)          │
│    Card: glassmorphism with subtle border glow                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

#### 2. `/` — Fleet Command Center (Overview)

This is the "home base" — the screen the fleet manager sees first thing in the morning.

```
┌──────┬──────────────────────────────────────────────────────────────────┐
│      │  ⬡ kazindustries            [Cmd+K Search]  🔔 3  [Avatar ▾]   │
│      ├──────────────────────────────────────────────────────────────────┤
│  S   │                                                                  │
│  I   │  FLEET COMMAND CENTER                              ☀️/🌙 Toggle  │
│  D   │                                                                  │
│  E   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐   │
│  B   │  │ 96         │ │ 12         │ │ 87.2%      │ │ 68%        │   │
│  A   │  │ vehicles   │ │ need       │ │ first-time │ │ bay        │   │
│  R   │  │ monitored  │ │ service ▲3 │ │ fix rate ▲ │ │ util.  ▼2% │   │
│      │  │ ●●● trend  │ │ ●●● trend  │ │ ●●● trend  │ │ ●●● trend  │   │
│  ┌─┐ │  └────────────┘ └────────────┘ └────────────┘ └────────────┘   │
│  │◆│ │                                                                  │
│  │ │ │  ┌──────────────────────────────────┬───────────────────────┐   │
│  │O│ │  │                                  │  PRIORITY QUEUE       │   │
│  │v│ │  │     FLEET MAP                    │  (top 10)             │   │
│  │e│ │  │                                  │                       │   │
│  │r│ │  │  [Leaflet map with vehicle       │  1. VEH-042 ●crit    │   │
│  │v│ │  │   pins colored by health         │     Cooling 52.3     │   │
│  │i│ │  │   status: green/amber/red.       │     🤖 "Urgent"      │   │
│  │e│ │  │   Depot pins with capacity       │     [Dispatch →]     │   │
│  │w│ │  │   badges. Click pin = popover    │                       │   │
│  │ │ │  │   with vehicle/depot summary]    │  2. VEH-017 ●crit    │   │
│  │ │ │  │                                  │     Brakes 48.7      │   │
│  │T│ │  │  Zoom: India map, centered       │     🤖 "Emergency"   │   │
│  │r│ │  │  on fleet distribution           │     [Dispatch →]     │   │
│  │i│ │  │                                  │                       │   │
│  │a│ │  │  Cluster view at low zoom,       │  3. VEH-091 ●watch   │   │
│  │g│ │  │  individual pins at high zoom    │     Turbo 61.2       │   │
│  │e│ │  │                                  │     🤖 "Elevated"    │   │
│  │ │ │  │                                  │     [Dispatch →]     │   │
│  │W│ │  └──────────────────────────────────┤                       │   │
│  │o│ │                                     │  ...                  │   │
│  │r│ │  ┌───────────────┬──────────────┐  │                       │   │
│  │k│ │  │ HEALTH        │ ACTIVE       │  │  [View full queue →]  │   │
│  │f│ │  │ DISTRIBUTION  │ ALERTS       │  └───────────────────────┘   │
│  │l│ │  │               │              │                               │
│  │o│ │  │ [Donut chart] │ ⚠ VEH-042   │  ┌───────────────────────┐   │
│  │w│ │  │               │   cooling    │  │ AI ESCALATIONS        │   │
│  │ │ │  │  72 Healthy   │   spike      │  │                       │   │
│  │ │ │  │  16 Watch     │              │  │ 🔴 Batch pattern:     │   │
│  │D│ │  │   8 Critical  │ ⚠ VEH-017   │  │   3× BATCH-24Q2      │   │
│  │e│ │  │               │   brake      │  │   turbo degradation   │   │
│  │p│ │  │               │   wear       │  │   [Investigate →]     │   │
│  │o│ │  │               │              │  │                       │   │
│  │t│ │  │               │ ● VEH-008   │  │ 🟡 Capacity crunch:   │   │
│  │s│ │  │               │   exhaust    │  │   Pune depot at 90%   │   │
│  │ │ │  │               │   temp       │  │   utilization          │   │
│  │A│ │  │               │              │  │   [View depot →]      │   │
│  │l│ │  │               │ [View all →] │  │                       │   │
│  │e│ │  └───────────────┴──────────────┘  └───────────────────────┘   │
│  │r│ │                                                                  │
│  │t│ │  ┌─────────────────────────────────────────────────────────┐   │
│  │s│ │  │ LIVE ACTIVITY FEED                                 ● Live│   │
│  │ │ │  │                                                         │   │
│  │ │ │  │ 14:23  VEH-042 entered CRITICAL status (cooling: 52.3) │   │
│  │I│ │  │ 14:21  Service REQ-047 completed. VEH-031 health → 94  │   │
│  │n│ │  │ 14:18  Telemetry pulse. 3 vehicles re-ranked.          │   │
│  │t│ │  │ 14:15  VEH-017 dispatch to Pune depot (AI recommended) │   │
│  │e│ │  │                                                         │   │
│  │l│ │  └─────────────────────────────────────────────────────────┘   │
│  └─┘ │                                                                  │
└──────┴──────────────────────────────────────────────────────────────────┘

SIDEBAR NAVIGATION (left, collapsible):
  ◆ Command Center          (/ — this page)
  ⊘ Triage Queue            (/triage)
  ⇢ AI Dispatch             (/dispatch)
  ≡ Workflow Board          (/workflow)
  ⊞ Depot Network           (/depots)
  ⊕ Technicians             (/technicians)
  ◈ Decision Intelligence   (/intelligence)
  △ Alerts                  (/alerts)
  ─── separator ───
  ⊙ Settings                (/settings)
```

**Interactive behaviors:**
- **Map pins** — hover shows tooltip with vehicle ID + health. Click opens a Sheet (shadcn/ui) with full vehicle detail
- **Priority queue cards** — each card has a subtle left border colored by health status. AI assessment badge (purple glow) shows urgency with a one-line summary. "Dispatch" button opens the AI dispatch interface
- **Metric cards** — each has a sparkline trend (last 24h) using Recharts mini `AreaChart`. The delta (▲3, ▼2%) uses Framer Motion `AnimatePresence` to animate number changes
- **Health donut** — Recharts `PieChart` with animated segments. Click a segment to filter the map to only those vehicles
- **Alert feed** — auto-scrolls with new items animating in from the top (Framer Motion `AnimatePresence`). Each alert is clickable → navigates to vehicle detail
- **AI escalation cards** — purple border/glow (the AI accent). Each has a clear call-to-action button
- **Live pulse** — green dot pulses when SSE is connected. Red dot + "Reconnecting..." when disconnected

---

#### 3. `/triage` — AI Priority Queue

The main operational view. Where the fleet manager decides what to act on.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TRIAGE QUEUE                                    [Filters ▾] [Search]   │
│                                                                          │
│  ┌─ BULK ACTIONS ──────────────────────────────────────────────────┐    │
│  │ □ Select all    [Batch Dispatch]  [Export CSV]  96 vehicles     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ TABLE ─────────────────────────────────────────────────────────┐    │
│  │ # │ Vehicle   │ Health │ Score │ Status  │ AI Assessment │ Act. │    │
│  │───┼───────────┼────────┼───────┼─────────┼───────────────┼──────│    │
│  │ 1 │ VEH-042   │  52.3  │ 82.1  │●CRITICAL│ 🔴 Urgent     │ [⇢] │    │
│  │   │ RidgeRun. │ ▼10.2  │ ▲30.0 │ cooling │ Recurring     │      │    │
│  │   │ Pune C-2  │        │       │         │ cooling issue  │      │    │
│  │───┼───────────┼────────┼───────┼─────────┼───────────────┼──────│    │
│  │ 2 │ VEH-017   │  48.7  │ 79.3  │●CRITICAL│ 🔴 Emergency  │ [⇢] │    │
│  │   │ CargoMax  │ ▼5.8   │ ▲12.4 │ brakes  │ Safety-crit.  │      │    │
│  │   │ Delhi C-1 │        │       │         │ brake wear     │      │    │
│  │───┼───────────┼────────┼───────┼─────────┼───────────────┼──────│    │
│  │ 3 │ VEH-091   │  61.2  │ 68.5  │●WATCH   │ 🟡 Elevated   │ [⇢] │    │
│  │   │ Atlas H.  │ ▼3.1   │ ▲8.2  │ turbo   │ Boost trend   │      │    │
│  │   │ Jaipur C3 │        │       │         │ declining      │      │    │
│  │───┼───────────┼────────┼───────┼─────────┼───────────────┼──────│    │
│  │   │ ...       │        │       │         │               │      │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ EXPANDED ROW (click a row to expand) ─────────────────────────┐    │
│  │                                                                 │    │
│  │  VEH-042 — RidgeRunner — Pune Corridor 2                       │    │
│  │                                                                 │    │
│  │  ┌─────────────────┐  ┌──────────────────────────────────────┐ │    │
│  │  │ SUBSYSTEM RADAR │  │ HEURISTIC BREAKDOWN                  │ │    │
│  │  │                 │  │                                      │ │    │
│  │  │   [RadarChart   │  │  Safety urgency    ████████░░  72.4  │ │    │
│  │  │    showing all  │  │  Failure proximity ██████████  91.2  │ │    │
│  │  │    8 subsystems │  │  Business impact   ██████░░░░  58.3  │ │    │
│  │  │    with current │  │  Downtime cost     ████████░░  68.7  │ │    │
│  │  │    health as    │  │  Service window    ███░░░░░░░  32.1  │ │    │
│  │  │    filled area  │  │                                      │ │    │
│  │  │    and baseline │  │  Heuristic score: 78.4               │ │    │
│  │  │    as outline]  │  │  AI adjusted:     82.1 (▲ 3.7)      │ │    │
│  │  └─────────────────┘  └──────────────────────────────────────┘ │    │
│  │                                                                 │    │
│  │  ┌─ AI REASONING ─────────────────────────── 🤖 OpenRouter AI ┐ │  │
│  │  │                                                              │ │  │
│  │  │  "This vehicle should be ESCALATED from score 78.4 to 82.1. │ │  │
│  │  │                                                              │ │  │
│  │  │  Risk factors identified:                                    │ │  │
│  │  │  • Coolant temp spiked to 104°C — 12°C above threshold.     │ │  │
│  │  │    This is a 3.2σ deviation from this vehicle's 30-day avg. │ │  │
│  │  │  • Service history shows a cooling intervention 45 days ago  │ │  │
│  │  │    (REQ-031, Pune depot, Tech Rajesh K). The repair may not  │ │  │
│  │  │    have addressed the root cause — this looks like a         │ │  │
│  │  │    recurring failure pattern.                                 │ │  │
│  │  │  • This vehicle operates on Pune Corridor 2, which has 14%   │ │  │
│  │  │    higher ambient temperatures than fleet average.            │ │  │
│  │  │                                                              │ │  │
│  │  │  Recommendation: Immediate dispatch to Pune depot for        │ │  │
│  │  │  extended cooling system diagnostics. Do NOT assign same     │ │  │
│  │  │  technician as last time — consider Mira Rao for fresh       │ │  │
│  │  │  diagnostic perspective."                                    │ │  │
│  │  │                                                              │ │  │
│  │  │  Confidence: 87%          Tokens used: 1,847                 │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  │                                                                 │    │
│  │  ┌────────────────────────┐  ┌────────────────────────┐        │    │
│  │  │ 🤖 AI Dispatch         │  │ ⚡ Quick Dispatch       │        │    │
│  │  │    (full agent run)    │  │    (heuristic only)    │        │    │
│  │  └────────────────────────┘  └────────────────────────┘        │    │
│  │                                                                 │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key interactions:**
- **Row click** → expands with Framer Motion `AnimatePresence` height animation
- **AI Reasoning panel** — purple gradient border (subtle glow), `🤖 OpenRouter` badge
- **AI Dispatch button** — opens full-screen dispatch interface (see `/dispatch` page)
- **Quick Dispatch** — uses heuristic-only matching, instant, no AI wait
- **Table sorting** — click column headers. Sort animation on rows (Framer Motion `layoutId`)
- **Filters** — shadcn/ui `Popover` with checkboxes: status (healthy/watch/critical), region, depot, subsystem
- **Search** — instant filter by vehicle ID, VIN, model, route name
- **Keyboard** — J/K to navigate rows, Enter to expand, D to dispatch, Esc to collapse

---

#### 4. `/dispatch` — AI Dispatch Agent Interface

This is the star feature. A full-screen interface where the AI agent runs a multi-step dispatch decision.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  AI DISPATCH — VEH-042                              [Cancel]  [Accept]  │
│                                                                          │
│  ┌─ AGENT TRACE (live streaming) ──────────────────────────────────┐    │
│  │                                                                  │    │
│  │  🤖 Starting dispatch analysis for VEH-042...                    │    │
│  │                                                                  │    │
│  │  Step 1: Fetching vehicle data                          ✓ 0.3s  │    │
│  │  → RidgeRunner, Pune Corridor 2, cooling subsystem critical     │    │
│  │                                                                  │    │
│  │  Step 2: Checking service history                       ✓ 0.4s  │    │
│  │  → Found prior cooling repair 45 days ago (REQ-031)             │    │
│  │  → Same DTC code P0217 — this is a RECURRING issue              │    │
│  │                                                                  │    │
│  │  Step 3: Evaluating Pune Response Hub                   ✓ 0.2s  │    │
│  │  → 3/10 bays open, cooling specialty ✓, COOL-SENS-15 in stock  │    │
│  │                                                                  │    │
│  │  Step 4: Evaluating Bengaluru Response Hub              ✓ 0.2s  │    │
│  │  → 5/12 bays open, cooling specialty ✓, but 487km away         │    │
│  │                                                                  │    │
│  │  Step 5: Checking technician availability at Pune       ✓ 0.3s  │    │
│  │  → Mira Rao: cooling certified, 92% FTF, 1/5 workload ✓       │    │
│  │  → Rajesh K: cooling certified, 94% FTF, BUT handled prior     │    │
│  │    repair that may have missed root cause — SKIPPING            │    │
│  │                                                                  │    │
│  │  Step 6: Searching similar past cases                   ✓ 0.5s  │    │
│  │  → 3 similar P0217 recurrences found in fleet history           │    │
│  │  → 2 of 3 were resolved by replacing coolant pump (not sensor)  │    │
│  │                                                                  │    │
│  │  Step 7: Generating dispatch plan                       ✓ 1.2s  │    │
│  │                                                                  │    │
│  │  Total: 7 steps, 3.1 seconds, 2,341 tokens              ● Done │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─ DISPATCH PLAN ─────────────────────────────────────────────────┐    │
│  │                                                                  │    │
│  │  📍 DEPOT: Pune Response Hub                                     │    │
│  │     42km away • 3 open bays • cooling specialty                 │    │
│  │     ETA: 1.1 hours                                               │    │
│  │                                                                  │    │
│  │  👤 TECHNICIAN: Mira Rao                                         │    │
│  │     Cooling certified • 92% first-time-fix • 1/5 workload      │    │
│  │     "Assigned instead of Rajesh K (prior repair may have        │    │
│  │      missed root cause — fresh perspective recommended)"         │    │
│  │                                                                  │    │
│  │  🔧 PARTS TO STAGE:                                              │    │
│  │     ✓ COOL-SENS-15  Coolant temperature sensor    (in stock: 4) │    │
│  │     ✓ COOL-PUMP-04  Coolant circulation pump      (in stock: 2) │    │
│  │     ⚠ Note: "Similar cases suggest pump replacement, not just   │    │
│  │        sensor. Stage both parts."                                │    │
│  │                                                                  │    │
│  │  ⏱ ESTIMATED: 4.5 hours repair time • ₹12,400 total cost        │    │
│  │                                                                  │    │
│  │  ⚠ WATCH POINTS:                                                 │    │
│  │     • Inspect coolant hose from prior repair for micro-cracks   │    │
│  │     • Check thermostat — may be sticking in hot conditions      │    │
│  │     • Request extended post-repair monitoring (48h telemetry)    │    │
│  │                                                                  │    │
│  │  📋 ALTERNATIVE PLAN:                                             │    │
│  │     If Pune is at capacity: Nagpur Response Hub (168km,          │    │
│  │     4.4h ETA, cooling capability, COOL-PUMP-04 needs transfer)  │    │
│  │                                                                  │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌───────────────────────────────┐  ┌────────────────────────────────┐ │
│  │  ✓ Accept & Dispatch          │  │  ✏️ Modify & Dispatch          │ │
│  │    (execute this plan)        │  │    (change depot/tech/parts)   │ │
│  └───────────────────────────────┘  └────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key interactions:**
- **Agent trace** — streams in real-time as the AI agent calls tools. Each step appears with a typing animation and a spinner that becomes a checkmark when done
- **Accept & Dispatch** — creates the service request with all pre-filled data. Optimistic UI update. Toast: "VEH-042 dispatched to Pune Response Hub"
- **Modify & Dispatch** — opens a Sheet (shadcn/ui) where the user can change depot, technician, or parts before confirming
- **The entire trace is stored** in `decision_logs` for audit and RL training

---

#### 5. `/workflow` — Service Workflow Kanban Board

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SERVICE WORKFLOW                        [Calendar view] [List view]    │
│                                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │DETECTED 2│ │ASSIGNED 4│ │PARTS     │ │SCHEDULED │ │IN PROG.  │    │
│  │          │ │          │ │CONFIRMED │ │    3     │ │    2     │    │
│  │ ┌──────┐ │ │ ┌──────┐ │ │    1     │ │ ┌──────┐ │ │ ┌──────┐ │    │
│  │ │REQ-  │ │ │ │REQ-  │ │ │ ┌──────┐ │ │ │REQ-  │ │ │ │REQ-  │ │    │
│  │ │052   │ │ │ │049   │ │ │ │REQ-  │ │ │ │045   │ │ │ │041   │ │    │
│  │ │VEH042│ │ │ │VEH017│ │ │ │048   │ │ │ │VEH008│ │ │ │VEH023│ │    │
│  │ │●crit │ │ │ │●crit │ │ │ │VEH091│ │ │ │●watch│ │ │ │●watch│ │    │
│  │ │cool. │ │ │ │brake │ │ │ │●watch│ │ │ │exh.  │ │ │ │turbo │ │    │
│  │ │      │ │ │ │      │ │ │ │turbo │ │ │ │      │ │ │ │      │ │    │
│  │ │[Adv.]│ │ │ │[Adv.]│ │ │ │      │ │ │ │[Adv.]│ │ │ │[Done]│ │    │
│  │ └──────┘ │ │ └──────┘ │ │ │[Adv.]│ │ │ └──────┘ │ │ └──────┘ │    │
│  │          │ │          │ │ └──────┘ │ │          │ │          │    │
│  │ ┌──────┐ │ │ ┌──────┐ │ │          │ │ ┌──────┐ │ │ ┌──────┐ │    │
│  │ │REQ-  │ │ │ │REQ-  │ │ │          │ │ │REQ-  │ │ │ │REQ-  │ │    │
│  │ │053   │ │ │ │050   │ │ │          │ │ │046   │ │ │ │042   │ │    │
│  │ └──────┘ │ │ └──────┘ │ │          │ │ └──────┘ │ │ └──────┘ │    │
│  │          │ │          │ │          │ │          │ │          │    │
│  │          │ │ ┌──────┐ │ │          │ │ ┌──────┐ │ │          │    │
│  │          │ │ │REQ-  │ │ │          │ │ │REQ-  │ │ │          │    │
│  │          │ │ │051   │ │ │          │ │ │047   │ │ │          │    │
│  │          │ │ └──────┘ │ │          │ │ └──────┘ │ │          │    │
│  │          │ │          │ │          │ │          │ │          │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘    │
│                                                                          │
│  Each card: click to open detail Sheet with full timeline,              │
│  AI dispatch reasoning, assigned depot/tech, parts list.                │
│                                                                          │
│  "Done" button opens COMPLETION FORM (feeds RL loop).                   │
│  "Advance" button moves card to next column with animation.             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Completion Form** (opens when "Complete" is clicked):

```
┌─ COMPLETE SERVICE — REQ-041 ────────────────────────────────────┐
│                                                                  │
│  What was actually wrong?                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [Dropdown: subsystem + free text]                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Was the initial diagnosis correct?    ○ Yes  ○ Partially  ○ No │
│                                                                  │
│  Parts actually used:                                            │
│  ☑ TRB-KIT-88  Turbocharger repair kit                          │
│  ☐ TRB-HOSE-14 Boost hose replacement set                      │
│  ☑ [+ Add part]                                                  │
│                                                                  │
│  Actual repair time:   [  3.5  ] hours                           │
│                                                                  │
│  First-time fix?       ○ Yes  ○ No (requires return visit)      │
│                                                                  │
│  Was this the right depot?    ★★★★☆                              │
│  Was this the right tech?     ★★★★★                              │
│  Was the priority correct?    ★★★★☆                              │
│                                                                  │
│  Technician notes:                                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Turbo wastegate actuator was sticking. Replaced kit.     │   │
│  │ Also found minor boost hose wear — recommend monitoring. │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────┐                                       │
│  │  ✓ Complete Service   │                                       │
│  └──────────────────────┘                                       │
│                                                                  │
│  This data feeds the reinforcement learning loop.                │
│  Better data = smarter AI decisions over time.                   │
└──────────────────────────────────────────────────────────────────┘
```

---

#### 6. `/intelligence` — Decision Intelligence Dashboard

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DECISION INTELLIGENCE                              [Last 30 days ▾]    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                   DECISION QUALITY TREND                       │     │
│  │                                                                │     │
│  │  100% ─┐                                                      │     │
│  │        │                                    ╱──── AI+Heuristic │     │
│  │   80% ─┤                              ╱───╱                   │     │
│  │        │                         ╱───╱                         │     │
│  │   60% ─┤                    ╱───╱                              │     │
│  │        │               ╱───╱                                   │     │
│  │   40% ─┤          ╱───╱ ─────────── Heuristic Only             │     │
│  │        │     ╱───╱                                             │     │
│  │   20% ─┤╱───╱                                                  │     │
│  │        └────┬────┬────┬────┬────┬────┬────┬────                │     │
│  │           Week 1    Week 2    Week 3    Week 4                 │     │
│  │                                                                │     │
│  │  The AI+Heuristic line should diverge upward from heuristic   │     │
│  │  only as the system learns from completed service outcomes.    │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐     │
│  │ Priority    │ │ Depot Match │ │ Tech Assign  │ │ Human        │     │
│  │ Accuracy    │ │ Score       │ │ Score        │ │ Override     │     │
│  │             │ │             │ │              │ │ Rate         │     │
│  │   78% ▲    │ │   82% ▲    │ │   75% ▲     │ │   12% ▼     │     │
│  │   ●●● trend│ │   ●●● trend│ │   ●●● trend │ │   ●●● trend │     │
│  └─────────────┘ └─────────────┘ └─────────────┘ └──────────────┘     │
│                                                                          │
│  ┌──────────────────────────────────┬─────────────────────────────┐     │
│  │ BEST DECISIONS                   │ WORST DECISIONS              │     │
│  │ (highest reward scores)          │ (lowest reward scores)       │     │
│  │                                  │                              │     │
│  │ 1. REQ-031: VEH-008 exhaust     │ 1. REQ-027: VEH-055 engine  │     │
│  │    AI predicted 4.2h, actual 4h  │    Wrong depot — no parts   │     │
│  │    First-time fix ✓              │    Required transfer → 2d   │     │
│  │    Reward: 0.94                  │    Reward: 0.31             │     │
│  │    [View decision chain →]       │    [View decision chain →]  │     │
│  │                                  │                              │     │
│  │ 2. REQ-035: VEH-012 turbo       │ 2. REQ-029: VEH-067 brakes  │     │
│  │    AI escalated correctly — the  │    Over-prioritized. Vehicle │     │
│  │    heuristic had it at #18,      │    was routine maintenance,  │     │
│  │    AI moved it to #4. Prevented  │    not urgent. Wasted depot  │     │
│  │    roadside breakdown.           │    capacity.                 │     │
│  │    Reward: 0.91                  │    Reward: 0.38             │     │
│  │    [View decision chain →]       │    [View decision chain →]  │     │
│  └──────────────────────────────────┴─────────────────────────────┘     │
│                                                                          │
│  ┌─ CONFIDENCE CALIBRATION ───────────────────────────────────────┐     │
│  │                                                                 │     │
│  │  When AI says 90% confident, is it right 90% of the time?      │     │
│  │                                                                 │     │
│  │  [Calibration plot: predicted probability vs actual frequency]  │     │
│  │                                                                 │     │
│  │  Perfect calibration = diagonal line.                           │     │
│  │  Above diagonal = overconfident. Below = underconfident.        │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Component Library (shadcn/ui + Custom)

```
apps/web/
├── app/
│   ├── layout.tsx                      # Root layout: ThemeProvider, Toaster, QueryClientProvider
│   ├── (auth)/
│   │   └── login/page.tsx              # Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Dashboard layout: Sidebar + TopBar + CommandPalette
│   │   ├── page.tsx                    # Fleet Command Center
│   │   ├── triage/
│   │   │   ├── page.tsx               # AI Priority Queue
│   │   │   └── [vehicleId]/page.tsx   # Vehicle Deep Dive
│   │   ├── dispatch/page.tsx          # AI Dispatch Agent Interface
│   │   ├── workflow/page.tsx          # Service Kanban Board
│   │   ├── depots/
│   │   │   ├── page.tsx               # Depot Network Map + List
│   │   │   └── [depotId]/page.tsx     # Depot Detail
│   │   ├── technicians/page.tsx       # Technician Roster
│   │   ├── intelligence/page.tsx      # Decision Intelligence Dashboard
│   │   ├── alerts/page.tsx            # Alert Feed + Escalations
│   │   └── settings/page.tsx          # Settings
│   └── globals.css                    # Tailwind base + shadcn/ui theme overrides
│
├── components/
│   ├── ui/                            # shadcn/ui primitives (installed via CLI)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── command.tsx                # Cmd+K command palette
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── tooltip.tsx
│   │   ├── avatar.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── popover.tsx
│   │   ├── select.tsx
│   │   ├── checkbox.tsx
│   │   ├── switch.tsx
│   │   ├── slider.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── sonner.tsx                 # Toast notifications
│   │   └── ... (more as needed)
│   │
│   ├── layout/
│   │   ├── sidebar.tsx                # Collapsible sidebar with nav items + footer
│   │   ├── top-bar.tsx                # Search, notifications bell, user avatar menu
│   │   ├── command-palette.tsx        # Cmd+K global search + actions
│   │   └── theme-toggle.tsx           # Dark/light mode switch
│   │
│   ├── fleet/
│   │   ├── fleet-map.tsx              # Leaflet map with vehicle + depot pins
│   │   ├── vehicle-pin.tsx            # Custom map marker (health-colored circle)
│   │   ├── depot-pin.tsx              # Custom map marker (capacity badge)
│   │   ├── health-donut.tsx           # Recharts PieChart (healthy/watch/critical)
│   │   ├── metric-card.tsx            # Stat card with sparkline + trend delta
│   │   └── animated-number.tsx        # Framer Motion number counter animation
│   │
│   ├── triage/
│   │   ├── priority-table.tsx         # Sortable, filterable vehicle table
│   │   ├── priority-row.tsx           # Expandable row with radar chart + AI panel
│   │   ├── subsystem-radar.tsx        # Recharts RadarChart (8 subsystems)
│   │   ├── heuristic-breakdown.tsx    # Horizontal bar breakdown (5 factors)
│   │   ├── ai-reasoning-panel.tsx     # Purple-bordered AI explanation panel
│   │   ├── ai-badge.tsx               # AI urgency badge (🔴🟡🟢 + label)
│   │   └── signal-sparklines.tsx      # Mini line charts for recent signal values
│   │
│   ├── dispatch/
│   │   ├── dispatch-agent.tsx         # Full AI dispatch interface
│   │   ├── agent-trace.tsx            # Step-by-step streaming trace display
│   │   ├── dispatch-plan-card.tsx     # Formatted dispatch plan output
│   │   ├── plan-modifier-sheet.tsx    # Sheet to modify depot/tech/parts before confirm
│   │   └── dispatch-confirm-dialog.tsx # Final confirmation dialog
│   │
│   ├── workflow/
│   │   ├── kanban-board.tsx           # Kanban columns by service status
│   │   ├── kanban-card.tsx            # Service request card (draggable)
│   │   ├── service-detail-sheet.tsx   # Full service request detail
│   │   ├── completion-form.tsx        # Structured outcome recording form (feeds RL)
│   │   └── timeline.tsx              # Service request timeline (vertical steps)
│   │
│   ├── depot/
│   │   ├── depot-network-map.tsx      # Map with capacity-colored depot pins
│   │   ├── depot-card.tsx             # Depot summary card
│   │   ├── bay-gauge.tsx              # Capacity gauge (circular progress)
│   │   ├── depot-detail.tsx           # Full depot detail view
│   │   └── inventory-table.tsx        # Parts inventory per depot
│   │
│   ├── intelligence/
│   │   ├── quality-trend-chart.tsx    # Line chart: reward score over time
│   │   ├── ai-vs-heuristic.tsx        # Comparison chart
│   │   ├── override-analytics.tsx     # Human override rate + analysis
│   │   ├── calibration-plot.tsx       # Predicted vs actual probability
│   │   ├── best-worst-decisions.tsx   # Top/bottom decision cards with drill-down
│   │   └── learning-velocity.tsx      # How fast is the system improving
│   │
│   ├── alerts/
│   │   ├── alert-feed.tsx             # Scrollable alert list with live updates
│   │   ├── alert-card.tsx             # Individual alert with severity styling
│   │   ├── escalation-card.tsx        # AI escalation with purple glow
│   │   └── notification-bell.tsx      # Header bell with badge count
│   │
│   └── shared/
│       ├── status-dot.tsx             # Colored dot indicator (health status)
│       ├── health-badge.tsx           # Health score badge (number + color)
│       ├── subsystem-tag.tsx          # Subsystem label tag
│       ├── empty-state.tsx            # Illustrated empty state placeholder
│       ├── loading-skeleton.tsx       # Skeleton loaders for each card type
│       ├── error-boundary.tsx         # Error boundary with retry button
│       └── keyboard-shortcuts.tsx     # Global keyboard shortcut handler
│
├── hooks/
│   ├── use-sse.ts                     # SSE connection management + Zustand updates
│   ├── use-vehicles.ts                # TanStack Query: fetch vehicles
│   ├── use-priority-queue.ts          # TanStack Query: fetch priority queue
│   ├── use-service-requests.ts        # TanStack Query + mutations
│   ├── use-dispatch.ts                # AI dispatch mutation + streaming trace
│   ├── use-depots.ts                  # TanStack Query: fetch depots
│   ├── use-technicians.ts             # TanStack Query: fetch technicians
│   ├── use-keyboard.ts                # Keyboard shortcut registration
│   └── use-theme.ts                   # Theme toggle (localStorage + class)
│
├── stores/
│   └── dashboard-store.ts             # Zustand store: all real-time state
│       │
│       │  State shape:
│       │  {
│       │    vehicles: Map<string, VehicleRecord>,
│       │    priorityQueue: PriorityEntry[],
│       │    healthByVehicle: Map<string, HealthScore>,
│       │    aiAssessments: Map<string, AIAssessment>,
│       │    serviceRequests: ServiceRequest[],
│       │    alerts: Alert[],
│       │    escalations: Escalation[],
│       │    livePulse: LivePulse[],
│       │    sseConnected: boolean,
│       │    lastEventAt: string | null,
│       │  }
│       │
│       │  Updated by: SSE events → store.getState().handleEvent(event)
│       │  Consumed by: React components via useStore(selector)
│       │
│       └── Zustand with immer middleware for immutable updates
│
├── lib/
│   ├── api-client.ts                  # Typed fetch wrapper for all API calls
│   ├── query-client.ts                # TanStack Query client config
│   ├── format.ts                      # Number/date/duration formatters
│   └── cn.ts                          # clsx + twMerge utility (shadcn standard)
│
├── tailwind.config.ts                 # Tailwind config with shadcn/ui theme
├── components.json                    # shadcn/ui configuration file
└── next.config.mjs
```

---

## Authentication & Authorization

### NextAuth.js (Auth.js v5) Configuration

```typescript
// apps/web/auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import AzureAD from "next-auth/providers/azure-ad"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@kaz/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Verify against users table (bcrypt hashed passwords)
        // Return user with role and organizationId
      },
    }),
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.organizationId = user.organizationId
      }
      return token
    },
    session({ session, token }) {
      session.user.role = token.role
      session.user.organizationId = token.organizationId
      return session
    },
  },
})
```

### Role-Based Access Control

| Role | See | Do |
|---|---|---|
| `platform_admin` | Everything across all orgs | All actions. Manage orgs, users, system settings |
| `fleet_manager` | All vehicles, depots, service requests in their org | Dispatch, approve assignments, view AI insights, manage weights |
| `depot_manager` | Vehicles assigned to their depot, their depot's data | Accept/reject assignments, advance workflow, complete services |
| `technician` | Only their assigned work | View assignment details, mark work steps, record completion |
| `viewer` | Dashboards, read-only | No actions. Useful for executives, analysts |

### API Key Authentication (for OEM adapters and webhooks)

```
POST /api/v1/ingest/signals
Authorization: Bearer kaz_live_xxxxxxxxxxxxxxxxxxxx

Each API key is scoped to:
  - organizationId (tenant isolation)
  - allowedEndpoints (e.g., only ingest/*)
  - rateLimit (requests per minute)
  - expiresAt (optional expiration)
```

---

## Phase-by-Phase Build Plan

### Phase Overview

| Phase | Focus | Duration | Key Deliverable |
|---|---|---|---|
| **Phase 1** | Docker + Database + Repository Layer | 1–2 weeks | In-memory → persistent PostgreSQL + Redis |
| **Phase 2** | Real Worker + Simulator Pipeline | 1–2 weeks | Stub apps → real streaming BullMQ pipeline |
| **Phase 3** | AI Decision Engine (LangChain + OpenRouter) | 2–3 weeks | Heuristic → AI-augmented decisions with tool-calling agent |
| **Phase 4** | Reinforcement Learning Feedback Loop | 2–3 weeks | Static weights → self-improving decisions from outcomes |
| **Phase 5** | Enterprise Dashboard (shadcn/ui + Tailwind) | 2–3 weeks | Single-file demo → full enterprise command center |
| **Phase 6** | Auth + Multi-Tenancy + Testing | 1–2 weeks | Open access → production-grade security + 80%+ test coverage |
| **Phase 7** | Cloud Deployment + CI/CD | 1–2 weeks | Local Docker → Azure AKS production |

**Total: 10–16 weeks to production-ready Service Orchestration**

---

### PHASE 1: Docker + Database + Repository Layer

**Duration:** 1–2 weeks

**Goal:** Replace `DemoStore` (in-memory) with real PostgreSQL + TimescaleDB + Redis, all running in Docker Compose.

#### Sub-phase 1.1 — Docker Compose Local Stack

**Build:**

```yaml
# infra/docker/docker-compose.yml
services:
  postgres:
    image: timescale/timescaledb:latest-pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: kazindustries
      POSTGRES_USER: kaz
      POSTGRES_PASSWORD: kaz_local_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kaz -d kazindustries"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redisdata:/var/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

- Script: `pnpm infra:up` → `docker compose -f infra/docker/docker-compose.yml up -d`
- Script: `pnpm infra:down` → stop everything
- `.env.local` template with all connection strings

**Demo:** `pnpm infra:up` brings up PG + Redis. `psql` connects. `redis-cli ping` returns PONG.

#### Sub-phase 1.2 — Prisma Schema + Migrations

Finalize the Prisma schema for all service orchestration tables:

| Table | Key Columns |
|---|---|
| `organizations` | id, name, settings (JSONB), created_at |
| `users` | id, email, password_hash, role, organization_id |
| `vehicles` | id, vin, make, model, year, region, route, build_batch, software_version, coordinates, depot_affinity_id, organization_id |
| `depots` | id, name, city, region, coordinates, specialties (SubsystemKey[]), total_bays, occupied_bays, organization_id |
| `technicians` | id, name, depot_id, certifications (SubsystemKey[]), current_load, max_load, first_time_fix_rate |
| `parts_catalog` | part_number, name, subsystem, lead_days, price |
| `depot_inventory` | depot_id, part_number, quantity, reorder_point |
| `vehicle_faults` | id, vehicle_id, dtc_code, subsystem, severity, title, description, occurred_at, occurrences, active |
| `service_requests` | id, vehicle_id, priority_score, weakest_subsystem, depot_id, technician_id, required_part_numbers, status, timeline (JSONB), created_at, scheduled_for |
| `service_history` | id, vehicle_id, depot_id, technician_id, subsystem, outcome, resolved_at, first_time_fix |
| `decision_logs` | id, decision_type, vehicle_id, input_snapshot (JSONB), heuristic_output (JSONB), ai_output (JSONB), final_decision (JSONB), human_override, override_reason, created_at |
| `reward_signals` | id, decision_log_id, reward_score, reward_breakdown (JSONB), created_at |
| `oem_connections` | id, oem_id, connection_type, credentials (encrypted JSONB), signal_mapping (JSONB), organization_id, status |
| `api_keys` | id, key_hash, organization_id, allowed_endpoints, rate_limit, expires_at, created_at |
| `suppliers` | id, name, component_types, active_batches |
| `notification_log` | id, type, payload (JSONB), sent_at |

**TimescaleDB hypertables** (created via raw SQL migration):

| Hypertable | Columns | Partition |
|---|---|---|
| `vehicle_signals` | vehicle_id, timestamp, coolant_temp, oil_pressure, battery_voltage, turbo_boost, brake_wear, exhaust_temp, fuel_level, speed, mileage, lat, lng | By time (7 days) |
| `vehicle_health_snapshots` | vehicle_id, timestamp, overall, status, trend, weakest_subsystem, subsystem_scores (JSONB) | By time (7 days) |
| `priority_snapshots` | vehicle_id, timestamp, score, breakdown (JSONB) | By time (7 days) |

**Redis key schema:**

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `vehicle:signal:{id}` | STRING (JSON) | 60s | Latest signal snapshot cache |
| `vehicle:health:{id}` | STRING (JSON) | 60s | Latest health score cache |
| `vehicle:priority:{id}` | STRING (JSON) | 60s | Latest priority breakdown cache |
| `ai:priority:{id}` | STRING (JSON) | 300s | AI reasoning cache |
| `vehicle:depot-match:{id}` | STRING (JSON) | 120s | Depot recommendations cache |
| `vehicle:tech-match:{id}` | STRING (JSON) | 120s | Technician recommendations cache |
| `queue:priority` | SORTED SET | persistent | Real-time priority ranking |
| `depot:capacity:{id}` | STRING | 30s | Live bay availability |
| `lock:dispatch:{vehicleId}` | STRING | 30s | Distributed dispatch lock |
| `dedup:signal:{hash}` | SET member | 300s | Signal deduplication |
| `session:{token}` | STRING (JSON) | 24h | User session |
| `channel:dashboard` | PUB/SUB | — | SSE event broadcast |
| `ratelimit:api:{keyId}` | STRING (counter) | 60s | API rate limiting |

**Demo:** `pnpm db:migrate` runs migrations. `pnpm db:seed` populates with same 96 vehicles, 6 depots, 50 technicians. Prisma Studio shows all tables.

#### Sub-phase 1.3 — Repository Layer (Replace DemoStore)

New `packages/db/src/repositories/` directory:

```
VehicleRepository       findAll, findById, updateCoordinates, upsertSignals
DepotRepository         findAll, findById, updateCapacity, getAvailableBays
TechnicianRepository    findAll, findByDepot, updateWorkload
PartsRepository         getCatalog, getInventory, reservePart, releasePart
ServiceRequestRepo      create, findById, findOpen, updateStatus, complete
ServiceHistoryRepo      create, findByVehicle, getOutcomeStats
SignalRepository        insertSnapshot, getLatest, getRange (TimescaleDB)
HealthRepository        insertScore, getLatest, getTrend (TimescaleDB)
PriorityRepository      upsertScore (Redis ZADD), getQueue, getVehicleRank
DecisionLogRepo         create, findByVehicle, findByType, getRewardStats
```

- API server switches from `DemoStore` to repository layer
- All existing endpoints return the same response shapes (backward compatible)
- Redis for hot-path reads, PostgreSQL for persistence, TimescaleDB for time-series

**Demo:** All 25+ existing API endpoints work exactly as before, but data persists across restarts.

---

### PHASE 2: Real Worker + Simulator Pipeline

**Duration:** 1–2 weeks

**Goal:** Replace stubs with real BullMQ streaming pipeline.

#### Sub-phase 2.1 — Continuous Simulator

- Runs as a long-lived process
- Configurable tick interval (default: 10s) and fleet size
- Each tick: applies `applyMockTick()`, publishes to BullMQ queues
- Fault scenario profiles (gradual, sudden, intermittent, cascade)
- Graceful shutdown on SIGTERM

#### Sub-phase 2.2 — Background Worker

All 8 processors from the architecture diagram:
- SignalIngestProcessor → FaultProcessor → HealthProcessor → PriorityProcessor → AIReasoningProcessor → DepotMatchProcessor → TechMatchProcessor → NotificationProcessor
- Pipeline flow via job chaining
- Concurrency controls, retry with backoff, dead letter queue
- Bull Board at `/admin/queues` for monitoring

#### Sub-phase 2.3 — SSE Overhaul

Replace `setInterval` with Redis pub/sub-driven SSE:
- Worker publishes events to Redis channel
- API subscribes and fans out to SSE clients
- Event types: health_update, priority_change, fault_event, service_update, dispatch_event
- Client reconnection with backoff

**Demo:** Simulator → Worker → DB → API → SSE → Dashboard. Kill worker, restart — no data lost.

---

### PHASE 3: AI Decision Engine (LangChain + OpenRouter)

**Duration:** 2–3 weeks

**Goal:** LangChain + OpenRouter integration. AI-augmented priority, depot, tech matching. Full dispatch agent.

#### Sub-phase 3.1 — LangChain + OpenRouter Client Setup

- `packages/ai` package with ChatOpenAI configured for OpenRouter
- Base URL: `https://openrouter.ai/api/v1`, model: `z-ai/glm-4.5-air:free`
- Thinking mode: disabled for real-time (temperature fixed at 0.6)
- Token tracking, cost monitoring, response caching, fallback handling

#### Sub-phase 3.2 — AI-Augmented Priority Engine

- Heuristic runs synchronously (fast path, always available)
- AI runs asynchronously via BullMQ job
- AI reviews top 20 vehicles per tick
- Dashboard shows both scores + AI reasoning panel

#### Sub-phase 3.3 — AI-Augmented Depot + Technician Matching

- Depot reasoning chain with performance context
- Technician reasoning chain with DTC-specific history
- Full dispatch agent with 7 LangChain tools

#### Sub-phase 3.4 — AI Escalation Detection

- Periodic escalation scan (every 5 minutes)
- Detects: SLA risk, batch patterns, capacity crunch, rapid degradation
- Escalation cards on dashboard with purple AI styling

**Demo:** "AI Dispatch" button runs the full agent. 7 tool calls in 3-5 seconds. Complete dispatch plan with reasoning. "Why not Rajesh K?" is explained.

---

### PHASE 4: Reinforcement Learning Feedback Loop

**Duration:** 2–3 weeks

**Goal:** Every completed service generates reward signal that improves future decisions.

#### Sub-phase 4.1 — Decision Logging + Outcome Recording

- `decision_logs` table captures: input → heuristic output → AI output → human decision
- Enhanced completion form captures: actual fault, diagnosis accuracy, parts used, repair time, ratings
- Decision audit trail: click any past decision to see the full chain

#### Sub-phase 4.2 — Reward Signal Computation

Three reward functions (priority, depot, technician) — each weighted composite of:
- Diagnosis accuracy, urgency calibration, first-time-fix, turnaround efficiency, etc.
- Rewards stored in `reward_signals` table, linked to `decision_logs`
- Aggregate statistics computed as materialized views

#### Sub-phase 4.3 — AI Self-Improvement

- Prompt enrichment with historical outcomes (few-shot examples from best/worst decisions)
- Dynamic weight adjustment proposals (AI suggests, human approves)
- Pattern learning ("coolant temp > 98°C + oil pressure < 35 → likely engine bearing, not cooling")
- Confidence calibration tracking

#### Sub-phase 4.4 — Reward Dashboard

Decision Intelligence page (`/intelligence`) with:
- Quality trend charts, AI vs heuristic comparison, override analytics
- Best/worst decision drill-down, confidence calibration plots, learning velocity

**Demo:** After 50+ completed services, AI accuracy visibly improves. Before/after comparison shows value.

---

### PHASE 5: Enterprise Dashboard (shadcn/ui + Tailwind)

**Duration:** 2–3 weeks

**Goal:** Transform the 674-line single-file demo into the full enterprise command center described above.

#### Sub-phase 5.1 — Foundation

- Install and configure shadcn/ui + Tailwind CSS
- Set up theme (light/dark mode, color system, typography)
- Build layout components: Sidebar, TopBar, CommandPalette
- Set up Zustand store, TanStack Query, SSE hook
- Install Recharts, Framer Motion, react-leaflet

#### Sub-phase 5.2 — Fleet Command Center (`/`)

- Fleet map with Leaflet (vehicle pins + depot pins)
- Metric cards with sparkline trends
- Health distribution donut chart
- Priority queue preview (top 10)
- AI escalation cards
- Live activity feed
- All with real-time SSE updates and animations

#### Sub-phase 5.3 — Triage Queue (`/triage`)

- Full sortable/filterable/searchable priority table
- Expandable rows with radar chart + heuristic breakdown + AI reasoning panel
- AI urgency badges with purple glow styling
- Keyboard navigation (J/K/Enter/Esc/D)

#### Sub-phase 5.4 — AI Dispatch (`/dispatch`)

- Full-screen dispatch agent interface
- Streaming agent trace (tool calls animate in)
- Dispatch plan card with all details
- Accept / Modify / Cancel actions
- Decision stored for RL training

#### Sub-phase 5.5 — Workflow Board (`/workflow`)

- Kanban board with drag-and-drop (or button-based advancement)
- Service detail Sheet with timeline
- Completion form with structured outcome recording

#### Sub-phase 5.6 — Supporting Pages

- `/depots` — network map + capacity gauges
- `/technicians` — roster + workload distribution
- `/intelligence` — decision quality dashboard (from Phase 4)
- `/alerts` — alert feed + escalations
- `/settings` — org config, priority weights, API keys, user management

#### Sub-phase 5.7 — Polish

- Dark mode toggle (class-based Tailwind)
- Responsive design (md/lg breakpoints for tablet)
- Loading skeletons for all async sections
- Error boundaries with retry
- Toast notifications (Sonner)
- Cmd+K command palette
- Number animation (Framer Motion)
- Empty states with illustrations

**Demo:** A beautiful, engaging, interactive dashboard that a fleet manager opens in the morning and uses all day. Every click leads to an action. AI reasoning is visible and transparent. The system feels alive — vehicles move on the map, health scores pulse, the queue re-sorts with smooth animations.

---

### PHASE 6: Auth + Multi-Tenancy + Testing

**Duration:** 1–2 weeks

**Goal:** Production-grade security and test coverage.

#### Sub-phase 6.1 — Authentication + RBAC

- NextAuth.js v5 with Credentials + Azure AD providers
- JWT sessions stored in Redis
- RBAC middleware on all API routes
- Role-based UI (hide actions user can't perform)
- Login page with email/password + SSO button

#### Sub-phase 6.2 — Multi-Tenancy

- Organization model + `organization_id` on all data tables
- Query scoping middleware (all queries filtered by org)
- API key management per organization

#### Sub-phase 6.3 — Test Coverage

| Type | Tool | Target |
|---|---|---|
| Unit tests | Vitest | Signal trust, orchestration, AI output parsers, utils |
| Integration tests | Vitest + Testcontainers | Repositories against real PG/Redis in Docker |
| API tests | Supertest | All endpoints — happy path, auth, validation |
| AI chain tests | Vitest + LangChain mock | Structured output parsing, fallback behavior |
| E2E smoke | Playwright (minimal) | Login → command center → dispatch → complete |

80%+ coverage on core business logic packages.

**Demo:** `pnpm test` runs full suite, all green. Coverage report shows 80%+ on `signal-trust`, `orchestration`, `ai`.

---

### PHASE 7: Cloud Deployment + CI/CD

**Duration:** 1–2 weeks

**Goal:** Azure production infrastructure.

#### Sub-phase 7.1 — CI/CD (GitHub Actions)

- `ci.yml` — lint, typecheck, unit tests on every push
- `test.yml` — full test suite on push to `main`
- `deploy-staging.yml` — auto-deploy to staging on merge to `main`
- `deploy-prod.yml` — manual trigger / tag for production
- Multi-stage Docker builds for API, worker, simulator, web

#### Sub-phase 7.2 — Terraform (Azure)

| Resource | Azure Service | Spec |
|---|---|---|
| Kubernetes | AKS | 2-3 node pool, autoscaling |
| Database | Azure Database for PostgreSQL Flexible Server | TimescaleDB extension, 4 vCores / 16GB |
| Cache | Azure Cache for Redis | Standard C1, 1GB |
| Container Registry | Azure Container Registry | Basic tier |
| Ingress | AKS LoadBalancer + NGINX Ingress | Azure-assigned public IP / FQDN (no custom domain needed) |
| TLS | Let's Encrypt via cert-manager | Auto-renewing certs on Azure-provided FQDN |
| Monitoring | Azure Monitor + Application Insights | Logs, metrics, traces, alerts |
| Secrets | Azure Key Vault | All API keys, DB credentials, OPENROUTER_API_KEY |

Kubernetes deployments:

| Service | Replicas | HPA | Resources |
|---|---|---|---|
| `api` | 2 | 2–5 (CPU-based) | 512Mi RAM, 250m CPU |
| `worker` | 2 | 2–4 (queue depth) | 1Gi RAM, 500m CPU |
| `simulator` | 1 | — | 256Mi RAM, 100m CPU |
| `web` | 2 | 2–4 (CPU-based) | 256Mi RAM, 100m CPU |

- NGINX Ingress with TLS termination
- Pod Disruption Budgets for zero-downtime deploys
- Network policies for pod-to-pod security
- ConfigMaps + Secrets from Key Vault

#### Sub-phase 7.3 — Production Hardening

| Area | Implementation |
|---|---|
| **Rate limiting** | Per-endpoint, per-API-key quotas via Redis counters |
| **Request validation** | Zod schemas on all inputs — reject malformed requests |
| **Error handling** | Structured JSON error responses, no stack traces in production |
| **Logging** | Pino structured JSON, correlation IDs per request → Azure Monitor |
| **Metrics** | Prometheus-compatible: request latency, queue depth, AI response time, error rate |
| **Alerting** | Azure Monitor alerts: high error rate, queue backup, AI latency spike, DB pool exhaustion |
| **Health checks** | `/health` checks DB + Redis + BullMQ + AI provider connectivity |
| **Graceful shutdown** | SIGTERM: drain connections, finish in-progress jobs, then exit |
| **Database** | Connection pooling (Prisma pool), query timeouts, slow query logging |
| **Security** | Helmet headers, CORS whitelist, input sanitization, dependency audit |

**Demo (Phase 7 Final — "PRODUCTION"):**

The full Service Orchestration platform running on Azure:

- Accessible via Azure-provided FQDN (e.g., `http://<aks-lb-ip>` or `https://kaz-orch-aks.eastus.cloudapp.azure.com`)
- Auto-scaling under load
- Monitored with alerts
- CI/CD deploying on every merge to `main`
- Database backed up automatically
- AI decisions flowing through LangChain + OpenRouter
- RL feedback loop capturing outcomes and improving over time
- Enterprise dashboard with dark mode, keyboard shortcuts, AI dispatch agent, real-time animations

---

## What Comes Next (Out of Scope for This Plan)

Once the Service Orchestration platform is production-ready:

### → Telemetry Forensics Module

The forensics package (`@kaz/forensics`) already has significant in-memory logic:
cohort analysis, DTC sequence mining, cross-system correlation, investigation workflow,
supplier scorecards, geographic heatmaps. Next step: persist in the database, connect to
the real telemetry pipeline, add AI-powered root cause analysis using the same LangChain +
OpenRouter infrastructure built in Phase 3.

### → Predictive Warranty Shield Module

With the RL feedback loop generating structured outcome data from every completed service,
you'll have the labeled training data needed for predictive models. The warranty shield can
predict which vehicles will fail before they do, and recommend proactive interventions that
avoid warranty claims.

**The Service Orchestration platform must be built first because it generates the data
that Forensics and Warranty Shield need to function.**

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OpenRouter free model limits or outages | Medium | Medium | Fallback to heuristic-only mode. Cache AI responses. Consider secondary model/provider |
| AI recommendations are poor initially | High | Low | Heuristics are the primary path. AI is advisory-only until confidence improves. Human override always available |
| RL feedback loop needs volume to work | High | Medium | Start heuristic-only. RL improves over time. Need 50+ completions for meaningful improvement |
| Database migration complexity | Low | Medium | Prisma Migrate handles versioning. Test against staging before production |
| Docker resource requirements | Low | Low | Minimal footprint: PG + Redis + apps. Any dev machine handles it |
| Azure costs | Medium | Medium | Start with minimal tiers. Scale based on actual load. Monitor costs weekly |
| Scope creep into Forensics/Warranty | Medium | High | Hard boundary: this plan is orchestration only. Those modules start AFTER this plan is complete |
| Dashboard performance with many vehicles | Medium | Medium | Virtualized lists (TanStack Virtual), pagination, SSE filtering by viewport |
| OEM API access delays | High | Medium | Mock adapter provides full functionality for dev/demo/staging. Real adapters added per-OEM |

---

## Key Principles

1. **Heuristics first, AI second.** The system works perfectly without AI. AI enriches — it never blocks the critical path.
2. **Every decision is auditable.** Full chain: input data → heuristic score → AI recommendation → human decision → outcome → reward. Complete transparency.
3. **The system gets smarter over time.** Every completed service makes future decisions better. This is the core differentiator.
4. **Docker-first, cloud-last.** One command to start locally. No cloud dependency for development.
5. **The dashboard drives action, not vanity.** Every screen leads to a decision. No decorative charts. Every pixel earns its place.
6. **AI is visible and explainable.** The purple-accented AI panels show exactly what the AI thinks and why. Users trust systems they can understand.
7. **Fail gracefully, always.** AI down → heuristics. Redis down → PostgreSQL. DB slow → serve from cache. No single component takes down the system.
8. **The data pipeline is the product.** OEM cloud → adapter → normalization → ingestion → health scoring → priority ranking → AI reasoning → dispatch → outcome → learning loop. End to end.

---

*This plan describes the complete architecture and build path for the kazindustries Service Orchestration platform. Each phase has a clear demo gate. No phase requires cloud infrastructure until Phase 7.*
