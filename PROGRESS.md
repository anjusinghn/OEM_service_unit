# KAZINDUSTRIES — Progress Report

> **Last updated:** 16 March 2026
> **Status:** Phase 0 + Phase 1 + Phase 2 complete. Phase 3 not started.

---

## What's Been Built — Phase by Phase

### Phase 0: Foundation + Signal Trust ✅

| Sub-phase | What was built | Status |
|---|---|---|
| **0.1 — Scaffold** | Turborepo + pnpm monorepo, Express API with helmet/cors/pino/zod, Next.js web app, worker & simulator apps, shared packages (`@kaz/shared`, `@kaz/db`, `@kaz/ui`) | ✅ Done |
| **0.2 — Database** | Full Prisma schema with 25+ models (vehicles, signals, faults, depots, technicians, parts, service history, etc.). 877-line seed script generating 96 vehicles, 6 depots (Indian cities), 50 technicians, realistic parts catalog | ✅ Done |
| **0.3 — OEM Adapter + Simulator** | Abstract `OEMAdapter` interface + mock adapter that generates a 96-vehicle fleet with deterministic PRNG. `applyMockTick()` simulates signal degradation, random fault injection/clearing over time | ✅ Done |
| **0.4 — Signal Trust Core** | `computeHealthScore()` — 8-subsystem scoring (engine, cooling, brakes, electrical, exhaust, turbo, fuel, transmission). Fault severity weighting, trend detection (degrading/stable/improving), weakest subsystem identification. `dedupeAlerts()` for alert consolidation | ✅ Done |

### Phase 1: Service Orchestration ✅

| Sub-phase | What was built | Status |
|---|---|---|
| **1.1 — Priority Engine** | 5-factor weighted scoring: safety urgency (30%), failure proximity (25%), business impact (20%), downtime cost (15%), service window (10%). Returns sorted queue with human-readable reasoning per vehicle | ✅ Done |
| **1.2 — Depot Matching** | Multi-criteria scoring: specialty match (+35), parts availability (+30), capacity (+7/bay), distance penalty (−0.45/km). Returns top 3 depot recommendations with ETA | ✅ Done |
| **1.3 — Parts Availability** | Integrated into depot matching — `partsReady` check verifies per-depot inventory for the vehicle's weakest subsystem. Parts availability directly affects depot ranking | ✅ Done |
| **1.4 — Technician Assignment** | Skill match (+44), first-time-fix rate weighting, workload capacity. Returns top 3 technician recommendations | ✅ Done |
| **1.5 — Service Workflow** | Full state machine: `DETECTED → PRIORITIZED → DEPOT_ASSIGNED → PARTS_CONFIRMED → TECHNICIAN_ASSIGNED → SCHEDULED → IN_PROGRESS → COMPLETED → CLOSED`. Dispatch, advance, complete operations. Service history recording with feedback loop (faults cleared, signals improve on completion) | ✅ Done |
| **1.6 — Dashboard** | 674-line Next.js dashboard with sidebar nav (Overview, Triage, Forensics, Workflow, Depot Network, Alerts, Activity). Real-time SSE streaming. Dispatch/advance/complete actions from UI. Metric cards, vehicle detail, priority breakdown. 29KB custom CSS | ✅ Done |

### Phase 2: Telemetry Forensics ✅

| Sub-phase | What was built | Status |
|---|---|---|
| **2.1 — Cohort Analysis** | Groups vehicles by 6 dimensions (buildBatch, softwareVersion, region, model, dutyCycle, depot). Fault profile comparison vs fleet baseline. Chi-squared significance testing. Auto-detects anomalous cohorts (≥2x fault rate, p<0.05). Severity tiering (critical/high/medium/low) | ✅ Done |
| **2.2 — Failure Patterns** | DTC sequence mining (e.g., "P0171 → P0300 → P0420 chain"). Cross-system Pearson correlation across all subsystem pairs (threshold \|r\|>0.35). Geographic heatmap by region/fault. Pattern confidence scoring | ✅ Done |
| **2.3 — Root Cause & Investigations** | 7-stage investigation workflow (`INVESTIGATION_OPENED → EVIDENCE_COLLECTED → ROOT_CAUSE_IDENTIFIED → CONTAINMENT_RECOMMENDED → ACTION_TAKEN → VERIFIED`). Evidence package builder (signal comparisons, DTC history, service history, cohort context, supplier context). Containment recommendation engine (monitor / service campaign / software update / supplier escalation). Cost modeling (₹35k proactive vs ₹2.8L warranty claim). Supplier scorecards with batch-level drill-down | ✅ Done |

### Phase 3: Predictive Warranty Shield ❌ (Not Started)

Per the plan, Phase 3 has 3 sub-phases:

1. **3.1 — Historical Failure Labeling** (Week 20-23): Warranty claim data model, outcome labeling pipeline linking claims to prior telemetry, failure mode catalog ranked by cost
2. **3.2 — Prediction Models** (Week 23-27): Feature engineering from signals/DTCs/service history, ML model infrastructure (XGBoost, survival analysis), per-vehicle risk scoring API
3. **3.3 — Intervention Optimizer** (Week 27-30): Intervention window calculator, cost-benefit analysis, campaign builder, warranty cost avoidance tracker

---

## What's NOT Built Yet

1. **Worker app** — Just an 8-line demo script, not a real BullMQ background processor
2. **Simulator app** — Just logs mock data stats, not a continuous streaming simulator
3. **Auth system** — No NextAuth.js, no login, no RBAC, no multi-tenancy
4. **Real database connection** — Everything runs in-memory via `DemoStore`. No PostgreSQL/TimescaleDB/Redis
5. **Docker Compose** — No containerized local dev stack
6. **CI/CD** — No GitHub Actions
7. **Infrastructure** — No Terraform/Azure setup
8. **Phase 3 (Predictive Warranty Shield)** — Not started

---

## Codebase Stats

| Area | Lines | Notes |
|---|---|---|
| Business logic (signal-trust + orchestration + forensics) | ~1,017 | Core domain engines |
| Data/schema (db) | ~1,704 | Prisma schema + seed script |
| Types/infrastructure (shared) | ~605 | Full type system for all 3 phases |
| Mock/simulation (oem-adapters) | ~374 | Realistic telemetry simulator |
| API server | ~645 | 25+ REST endpoints + SSE |
| Web dashboard | ~674 | Single-page dashboard with 7 nav sections |
| UI components | ~48 | Minimal — MetricCard, SectionCard, StatusPill |

---

## How to Test

### Quick start (run everything)

```bash
cd ~/OEM_service_unit
pnpm dev
```

This starts both API and web in parallel via Turbo.

### Or run them separately (recommended for first time)

**Terminal 1 — Start the API:**

```bash
cd ~/OEM_service_unit
pnpm dev:api
```

Starts Express on **http://localhost:4000**. You should see:

```
[api] kazindustries phase-one demo listening on http://localhost:4000
```

**Terminal 2 — Start the dashboard:**

```bash
cd ~/OEM_service_unit
pnpm dev:web
```

Starts Next.js on **http://localhost:3000**.

### Things to try in the browser

1. **Open http://localhost:3000** — Full dashboard with sidebar navigation
2. **Overview tab** — Fleet health metrics (healthy/watch/critical counts), bay utilization, turnaround time
3. **Triage tab** — Priority queue of vehicles ranked by urgency. Click any vehicle to see WHY it's ranked there (safety urgency, failure proximity, business impact breakdown)
4. **Click "Dispatch"** on a high-priority vehicle — Creates a service request, assigns depot + technician automatically
5. **Workflow tab** — See active service requests. Click "Advance" to move through the state machine (DEPOT_ASSIGNED → PARTS_CONFIRMED → TECHNICIAN_ASSIGNED → SCHEDULED → IN_PROGRESS)
6. **Click "Complete"** — Finishes the service. The vehicle's faults clear, signals improve, health score jumps back up
7. **Forensics tab** — Anomalous cohorts, DTC sequence patterns, supplier scorecards, investigation workflow
8. **Live updates** — The API ticks every 12 seconds, applying signal changes. Vehicle health scores shift in real-time over SSE. Watch degrading vehicles climb the priority queue

### Test the API directly (curl)

```bash
# Health check
curl http://localhost:4000/health

# Full dashboard payload
curl http://localhost:4000/api/v1/dashboard | jq '.overview'

# Priority queue (top 5)
curl http://localhost:4000/api/v1/orchestration/priority-queue | jq '.[0:5]'

# Vehicle detail
curl http://localhost:4000/api/v1/vehicles | jq '.[0].id'
# then use that ID:
curl http://localhost:4000/api/v1/vehicles/VEH-001

# Depot recommendations for a vehicle
curl http://localhost:4000/api/v1/orchestration/vehicles/VEH-001/depot-match

# Technician recommendations
curl http://localhost:4000/api/v1/orchestration/vehicles/VEH-001/tech-match

# Dispatch a vehicle (creates service request)
curl -X POST http://localhost:4000/api/v1/orchestration/vehicles/VEH-001/dispatch

# List service requests
curl http://localhost:4000/api/v1/service-requests

# Advance a service request (use actual request ID)
curl -X PATCH http://localhost:4000/api/v1/service-requests/REQ-001/status \
  -H "Content-Type: application/json" -d '{}'

# Complete a service request
curl -X POST http://localhost:4000/api/v1/service-requests/REQ-001/complete

# Forensics: anomalous cohorts
curl http://localhost:4000/api/v1/forensics/anomalies | jq '.[0]'

# Forensics: DTC sequence patterns
curl http://localhost:4000/api/v1/forensics/patterns | jq '.[0]'

# Forensics: supplier scorecards
curl http://localhost:4000/api/v1/forensics/suppliers/scorecards | jq '.[0]'

# Forensics: geographic heatmap
curl http://localhost:4000/api/v1/forensics/heatmap

# Open an investigation from an anomaly
curl http://localhost:4000/api/v1/forensics/anomalies | jq '.[0].id'
# then:
curl -X POST http://localhost:4000/api/v1/forensics/investigations \
  -H "Content-Type: application/json" \
  -d '{"anomalyId": "ANOMALY-001"}'

# Get investigation evidence package
curl http://localhost:4000/api/v1/forensics/investigations/INV-001/evidence

# Advance investigation status
curl -X PATCH http://localhost:4000/api/v1/forensics/investigations/INV-001/status \
  -H "Content-Type: application/json" -d '{}'

# SSE live stream (streams JSON every 12 seconds)
curl -N http://localhost:4000/api/v1/events

# Reset everything back to initial state
curl -X POST http://localhost:4000/api/v1/demo/reset
```

### Run the demo apps

```bash
# Worker demo — prints top 5 priority vehicles and exits
pnpm dev:worker

# Simulator demo — prints fleet stats and exits
pnpm dev:simulator
```

---

## API Endpoint Reference

### Core

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/dashboard` | Full dashboard payload |
| GET | `/api/v1/events` | SSE live stream (ticks every 12s) |
| POST | `/api/v1/demo/reset` | Reset all state |

### Vehicles

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/vehicles` | List all vehicles |
| GET | `/api/v1/vehicles/:id` | Vehicle detail with signals, health, faults, recommendations |

### Orchestration

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/orchestration/priority-queue` | Ranked priority queue |
| GET | `/api/v1/orchestration/vehicles/:id/priority` | Single vehicle priority breakdown |
| GET | `/api/v1/orchestration/vehicles/:id/depot-match` | Top 3 depot recommendations |
| GET | `/api/v1/orchestration/vehicles/:id/tech-match` | Top 3 technician recommendations |
| POST | `/api/v1/orchestration/vehicles/:id/dispatch` | Create service request for vehicle |

### Depots & Service

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/depots` | List all depots with capacity |
| GET | `/api/v1/service-requests` | List service requests |
| PATCH | `/api/v1/service-requests/:id/status` | Advance request to next status |
| POST | `/api/v1/service-requests/:id/complete` | Complete and close request |

### Forensics

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/forensics/cohorts` | List all vehicle cohorts |
| GET | `/api/v1/forensics/cohorts/:id` | Cohort detail |
| GET | `/api/v1/forensics/cohorts/:id/compare` | Compare cohort vs fleet baseline |
| GET | `/api/v1/forensics/anomalies` | Auto-detected anomalous cohorts |
| GET | `/api/v1/forensics/patterns` | Detected failure patterns |
| GET | `/api/v1/forensics/patterns/:id` | Pattern detail |
| PATCH | `/api/v1/forensics/patterns/:id/status` | Confirm/reject pattern |
| GET | `/api/v1/forensics/investigations` | List investigations |
| GET | `/api/v1/forensics/investigations/:id` | Investigation detail |
| POST | `/api/v1/forensics/investigations` | Open investigation (body: `{anomalyId?, patternId?}`) |
| PATCH | `/api/v1/forensics/investigations/:id/status` | Advance investigation |
| GET | `/api/v1/forensics/investigations/:id/evidence` | Evidence package |
| GET | `/api/v1/forensics/suppliers/scorecards` | Supplier scorecards |
| GET | `/api/v1/forensics/heatmap` | Geographic failure heatmap |
