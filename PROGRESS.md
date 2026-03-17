# KAZINDUSTRIES - Progress Report

> **Last updated:** 17 March 2026
> **Status:** Production Phase 1 and Phase 2 are implemented in the repo. Phase 3 is not started. A demo-only fallback path still exists for local UI-only usage.

---

## Current Snapshot

The codebase is no longer just an in-memory orchestration demo.

- **Production data path exists**: PostgreSQL/TimescaleDB, Redis, BullMQ queues, worker processors, repository-backed API, and continuous simulator are all implemented.
- **Phase 1 is implemented end-to-end**: telemetry -> health recompute -> priority rerank -> depot match -> technician match -> service workflow -> live dashboard refresh.
- **Phase 2 is implemented on top of the same operational state**: cohorts, anomalies, failure patterns, investigations, supplier scorecards, and heatmap APIs are exposed and rendered in the dashboard.
- **Redis is used for three jobs**: cache, pub/sub, and BullMQ queue backing.
- **TimescaleDB role**: vehicle telemetry, health snapshots, and priority snapshots are stored in PostgreSQL tables intended for time-series usage.
- **Demo mode still exists**: setting `USE_DEMO_STORE=true` keeps the old in-memory path available, but the production repository-backed path is now implemented and is the main architecture to document.

---

## What Phase 1 and Phase 2 Mean Right Now

### Phase 1 - Service Orchestration

Phase 1 is the operational pipeline that decides which vehicle needs attention, where it should go, who should work on it, and how the service request moves through its lifecycle.

Implemented pieces:

- **Signal ingestion pipeline**: simulator sends telemetry and fault changes into BullMQ queues.
- **Health recompute**: worker recalculates vehicle health from latest signals plus active faults.
- **Priority engine**: worker rebuilds the triage queue and stores current priority plus time-stamped snapshots.
- **Depot recommendation**: best depot is recomputed from subsystem need, capacity, and parts availability.
- **Technician recommendation**: best technician is recomputed for the selected depot and subsystem.
- **Service workflow**: requests move through `DETECTED -> PRIORITIZED -> DEPOT_ASSIGNED -> PARTS_CONFIRMED -> TECHNICIAN_ASSIGNED -> SCHEDULED -> IN_PROGRESS -> COMPLETED -> CLOSED`.
- **Live operations UI**: the dashboard reads the latest snapshot and refreshes over SSE.

### Phase 2 - Telemetry Forensics

Phase 2 is the analysis layer that explains fleet-wide patterns instead of only vehicle-by-vehicle service execution.

Implemented pieces:

- **Cohort analysis**: vehicles are grouped by dimensions such as build batch, software version, region, model, duty cycle, and depot affinity.
- **Anomaly detection**: cohorts are compared against baseline fleet behavior to surface abnormal fault rates.
- **Failure pattern detection**: the system derives patterns from DTC sequences, subsystem relationships, and regional behavior.
- **Investigation workflow**: anomalies or patterns can be opened into investigations and progressed through review stages.
- **Evidence package building**: investigation detail can be expanded into related vehicles, signals, history, and supporting context.
- **Supplier scorecards**: component suppliers and active batches are linked into the forensics view.
- **Heatmap data**: fleet issues can be viewed geographically.

Important note: the current repository-backed Phase 2 analytics are generated from live operational state, and review overlays such as investigation state are maintained by the API process. That means the analysis experience works now, but some Phase 2 state still behaves more like an application overlay than a fully persisted long-term analytics platform.

---

## Architecture Until This Point

### 1. Monorepo layout

Apps:

- `apps/api` - Express API, SSE stream, Bull Board, production and demo store routing
- `apps/web` - Next.js dashboard UI
- `apps/worker` - BullMQ worker cluster for background processing
- `apps/simulator` - continuous mock OEM telemetry producer

Core packages:

- `packages/db` - Prisma schema, repositories, Redis helpers, queue definitions, seed/reset logic
- `packages/signal-trust` - health scoring and alert dedupe logic
- `packages/orchestration` - priority, depot, technician, and service workflow logic
- `packages/forensics` - cohort, anomaly, pattern, investigation, and evidence logic
- `packages/shared` - shared TypeScript domain types
- `packages/oem-adapters/mock` - mock OEM fleet generator and tick simulation
- `packages/ui` - dashboard UI primitives

### 2. Runtime topology

The implemented production-style local topology is:

1. `apps/simulator` generates telemetry snapshots and fault changes.
2. Those events are pushed into BullMQ queues backed by Redis.
3. `apps/worker` consumes the queues and updates persistence plus cache.
4. PostgreSQL/TimescaleDB stores durable operational and time-series data.
5. Redis stores hot-path cache entries and publishes dashboard refresh events.
6. `apps/api` reads from repositories, exposes REST endpoints, and fans updates to browsers over SSE.
7. `apps/web` renders the fleet command dashboard and operator actions.

### 3. End-to-end data flow

The current data flow is:

1. **Telemetry creation** - `apps/simulator/src/index.ts` generates a fleet state and runs continuous ticks.
2. **Queue submission** - simulator enqueues telemetry jobs to `telemetry-ingest` and fault jobs to `fault-events`.
3. **Signal persistence** - `processSignalIngest` writes signal snapshots to `vehicle_signals`, caches the latest signal in Redis, then enqueues `health-recompute`.
4. **Fault persistence** - `processFaultEvent` upserts or clears active faults, then enqueues `health-recompute`.
5. **Health scoring** - `processHealthRecompute` loads latest signal plus active faults, runs `computeHealthScore()`, writes a `vehicle_health_snapshots` record, caches health, then enqueues `priority-rerank`.
6. **Priority refresh** - `processPriorityRerank` rebuilds the triage queue, updates `priority_entries`, writes `priority_snapshots`, caches the current vehicle priority, then enqueues depot match, technician match, and notification jobs.
7. **Recommendation caching** - `processDepotMatch` and `processTechMatch` compute and cache depot and technician recommendations.
8. **Real-time broadcast** - `processNotification` publishes queue results to Redis channel `channel:dashboard`.
9. **API fan-out** - `apps/api/src/server.ts` subscribes to the dashboard channel and pushes updated payloads to connected SSE clients.
10. **Dashboard refresh** - `apps/web/components/dashboard.tsx` receives SSE events and re-renders the active operational view.

---

## Implemented Queues and What Each One Does

Defined in `packages/db/src/queues.ts`:

| Queue | Concurrency | Purpose |
|---|---:|---|
| `telemetry-ingest` | 10 | Persist latest telemetry snapshots and trigger health recompute |
| `fault-events` | 5 | Upsert or clear active faults and trigger health recompute |
| `health-recompute` | 5 | Rebuild vehicle health from latest signal + faults |
| `priority-rerank` | 2 | Recompute current priority, snapshots, and downstream recommendations |
| `depot-match` | 3 | Cache best depot recommendations per vehicle |
| `tech-match` | 3 | Cache best technician recommendations per vehicle |
| `notifications` | 2 | Publish live update events for the API/dashboard |

There is **no Temporal engine in the current implementation**. Workflow orchestration is currently handled by:

- the BullMQ job graph for background work, and
- the service request state machine for business workflow progression.

If "TempCal DB" meant **TimescaleDB**, that is part of the current stack. If it meant **Temporal**, that is not wired into the codebase right now.

---

## Redis: How It Is Used Right Now

Redis is implemented in `packages/db/src/redis.ts` and used in three separate ways.

### 1. Cache layer

Current cache keys in `packages/db/src/repositories/cache-repository.ts`:

- `vehicle:signal:{vehicleId}` - latest signal snapshot, TTL 60s
- `vehicle:health:{vehicleId}` - latest health score, TTL 60s
- `vehicle:priority:{vehicleId}` - latest priority entry, TTL 60s
- `vehicle:depot-match:{vehicleId}` - depot recommendations, TTL 120s
- `vehicle:tech-match:{vehicleId}` - technician recommendations, TTL 120s

This gives the system a hot read path without making Redis the source of truth.

### 2. Pub/Sub

- Channel: `channel:dashboard`
- Worker publishes update messages.
- API subscribes and uses those messages to trigger SSE pushes.
- Browser receives fresh dashboard payloads through `/api/v1/events`.

This is correct for live dashboard fan-out because the event is transient and the source of truth still lives in PostgreSQL and repository rebuilds.

### 3. BullMQ backing store

All BullMQ queues are Redis-backed. Redis therefore acts as the transport layer for asynchronous pipeline execution between simulator/API producers and worker consumers.

---

## Database and TimescaleDB: How It Is Used Right Now

The Prisma schema in `packages/db/prisma/schema.prisma` now models both operational state and analysis state.

### Foundation and tenant structure

- `organizations`
- `users`
- `api_keys`
- `oem_connections`

### Operational fleet state

- `vehicles`
- `vehicle_signals`
- `vehicle_health_snapshots`
- `priority_entries`
- `priority_snapshots`
- `vehicle_faults`
- `alerts`
- `depots`
- `bays`
- `parts`
- `inventory_items`
- `technicians`
- `service_requests`
- `service_timeline`
- `service_history`
- `sla_tracking`
- `webhooks`
- `notification_preferences`

### Phase 2 forensics state

- `forensics_cohorts`
- `cohort_members`
- `cohort_comparisons`
- `cohort_anomalies`
- `forensics_patterns`
- `forensics_investigations`
- `forensics_investigation_events`
- `supplier_info`
- `supplier_scorecards`

### What TimescaleDB gives this system

The schema stores telemetry, health history, and priority history as time-series shaped tables:

- `vehicle_signals`
- `vehicle_health_snapshots`
- `priority_snapshots`

So the system can support both:

- **operational reads** - latest known fleet state
- **historical analysis** - how a vehicle or fleet changed over time

---

## What the API Layer Does

`apps/api/src/server.ts` now exposes the current platform surface.

### Core operational endpoints

- `/health`
- `/api/v1/dashboard`
- `/api/v1/vehicles`
- `/api/v1/vehicles/:vehicleId`
- `/api/v1/orchestration/priority-queue`
- `/api/v1/orchestration/vehicles/:vehicleId/priority`
- `/api/v1/orchestration/vehicles/:vehicleId/depot-match`
- `/api/v1/orchestration/vehicles/:vehicleId/tech-match`
- `/api/v1/orchestration/vehicles/:vehicleId/dispatch`
- `/api/v1/depots`
- `/api/v1/service-requests`
- `/api/v1/service-requests/:requestId/status`
- `/api/v1/service-requests/:requestId/complete`
- `/api/v1/demo/reset`
- `/api/v1/events`

### Phase 2 forensics endpoints

- `/api/v1/forensics/cohorts`
- `/api/v1/forensics/cohorts/:cohortId`
- `/api/v1/forensics/cohorts/:cohortId/compare`
- `/api/v1/forensics/anomalies`
- `/api/v1/forensics/patterns`
- `/api/v1/forensics/patterns/:patternId`
- `/api/v1/forensics/patterns/:patternId/status`
- `/api/v1/forensics/investigations`
- `/api/v1/forensics/investigations/:investigationId`
- `/api/v1/forensics/investigations`
- `/api/v1/forensics/investigations/:investigationId/status`
- `/api/v1/forensics/investigations/:investigationId/evidence`
- `/api/v1/forensics/suppliers/scorecards`
- `/api/v1/forensics/heatmap`

### Operational modes supported by the API

- **Demo mode** - `USE_DEMO_STORE=true`, entirely in-memory
- **Repository mode** - default production-oriented path, reads from PostgreSQL/TimescaleDB and Redis-backed queues

Bull Board is also mounted at `/admin/queues` when repository mode is active.

---

## What the Dashboard Does Right Now

The dashboard in `apps/web/components/dashboard.tsx` already exposes both operational and forensic views.

Main navigation areas:

- Overview
- Triage
- Forensics
- Workflow
- Depot Network
- Alerts
- Activity
- Settings placeholder

What an operator can do today:

- watch live fleet refresh over SSE
- inspect the current priority queue
- open a vehicle detail view with health, faults, and recommendations
- dispatch a vehicle into the service workflow
- advance a request through the workflow
- complete a request and watch health/fault state update
- review anomalies, patterns, investigations, supplier scorecards, and heatmap data
- reset the seeded environment back to a known state

---

## Seeded Local Data You Can Work With

`packages/db/src/seed.ts` seeds a realistic local dataset for testing.

Implemented seed coverage includes:

- 1 organization
- 5 users with multiple roles
- 1 OEM connection
- DTC registry
- signal definitions
- 10 depots across Indian cities
- bay inventory per depot
- parts catalog and inventory
- 50 technicians
- 96 vehicles
- 24 hours of telemetry history per vehicle
- active faults and alerts
- precomputed priority entries
- sample active service requests with workflow timelines
- SLA tracking records
- service history records
- sample webhook registration

This is enough to exercise both the Phase 1 operational workflow and the Phase 2 analysis views locally.

---

## Tech Stack Implemented So Far

### Platform and runtime

- TypeScript 5
- Node.js 22
- pnpm workspaces
- Turborepo

### Backend and APIs

- Express 5
- Zod
- pino-http + pino-pretty
- helmet
- cors

### Data and async infrastructure

- Prisma 6
- PostgreSQL
- TimescaleDB (`timescale/timescaledb:latest-pg16` in Docker)
- Redis 7
- ioredis
- BullMQ
- Bull Board

### Frontend

- Next.js 15
- React 19
- lucide-react
- shared internal UI package

### Internal domain packages

- `@kaz/db`
- `@kaz/shared`
- `@kaz/signal-trust`
- `@kaz/orchestration`
- `@kaz/forensics`
- `@kaz/oem-adapters-mock`

---

## What You Can Test Right Now

### Full production-style local stack

1. Copy env values if needed:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
pnpm infra:up
```

3. Push schema and seed the database:

```bash
pnpm --filter @kaz/db db:push
pnpm --filter @kaz/db db:seed
```

4. Start the worker:

```bash
pnpm dev:worker
```

5. Start the simulator:

```bash
pnpm dev:simulator
```

6. Start the API:

```bash
pnpm dev:api
```

7. Start the dashboard:

```bash
pnpm dev:web
```

### What to verify in this mode

- simulator is continuously enqueueing telemetry and fault changes
- worker logs show BullMQ jobs completing
- API returns dashboard, vehicle, service, and forensics payloads
- Bull Board shows queue traffic at `http://localhost:4000/admin/queues`
- dashboard updates live at `http://localhost:3000`
- dispatching and completing service requests changes DB-backed state
- forensics endpoints return cohort, anomaly, pattern, evidence, and supplier data

### Useful API checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/api/v1/dashboard | jq '.overview'
curl http://localhost:4000/api/v1/orchestration/priority-queue | jq '.[0:5]'
curl http://localhost:4000/api/v1/service-requests
curl http://localhost:4000/api/v1/forensics/anomalies | jq '.[0]'
curl http://localhost:4000/api/v1/forensics/patterns | jq '.[0]'
curl http://localhost:4000/api/v1/forensics/suppliers/scorecards | jq '.[0]'
curl -N http://localhost:4000/api/v1/events
```

### Demo-only fallback mode

If you only want the old lightweight flow without Redis/Postgres/worker/simulator, you can still run the API with `USE_DEMO_STORE=true`. That mode is useful for UI smoke testing, but it is not the production architecture path anymore.

---

## What Is Done vs What Is Still Incomplete

### Done for Phase 1 and Phase 2

- production database schema exists
- Dockerized local Postgres/TimescaleDB and Redis exist
- Redis cache and pub/sub exist
- BullMQ queues and worker processors exist
- continuous simulator exists
- repository-backed API exists
- dashboard integrates with the repository-backed API and SSE
- service workflow persistence exists
- phase 2 endpoints and UI exist

### Still incomplete or intentionally deferred

- auth/RBAC is modeled in schema but not wired into request handling yet
- real OEM adapters beyond the mock simulator are not implemented yet
- Phase 2 overlay state is not fully persisted as a long-lived analytics workflow system
- CI/CD and cloud deployment are still outside the currently implemented runtime path
- Phase 3 predictive warranty features are still not started

---

## Bottom Line

At this point, the application is a working local production-style fleet service platform for Phase 1 and Phase 2:

- telemetry is generated continuously
- jobs are processed asynchronously
- health and priority are recalculated automatically
- depot and technician recommendations are refreshed
- service requests move through a real persisted workflow
- live dashboard updates are pushed through Redis pub/sub and SSE
- forensic analysis is available from the same operational dataset

That means you can already test the platform as a real multi-process system, not just as an in-memory product demo.
