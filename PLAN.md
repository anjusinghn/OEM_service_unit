# KAZINDUSTRIES — Master Build Plan

## AI-Driven OEM Aftersales Decision & Orchestration Platform

> One-sentence answer: Yes, this can become a real business — but only if you sell a
> focused post-sales decision layer above existing telematics, not another telematics platform.

---

## What This Is NOT

- Not a telematics cloud
- Not a tracking dashboard
- Not a TCU / hardware product
- Not a generic "AI on telemetry" tool

## What This IS

An **aftersales decision/orchestration layer that sits ABOVE existing OEM telematics
clouds**. It turns noisy telemetry data into explainable decisions and workflow actions.

It answers: *"Why did it happen, which vehicles matter most right now, what should we
do next, and who should act?"*

---

## Locked Decisions

| Decision        | Choice                                              |
| --------------- | --------------------------------------------------- |
| Platform name   | **kazindustries**                                   |
| Backend         | TypeScript + Node.js (Express)                      |
| Frontend        | Next.js 14+ (App Router, React)                     |
| Cloud           | Microsoft Azure                                     |
| Primary DB      | PostgreSQL 16                                       |
| Time-series DB  | TimescaleDB (extension on PG)                       |
| Cache / Pub-Sub | Redis (via Azure Cache for Redis)                   |
| Message Queue   | BullMQ (Redis-backed) + Azure Service Bus           |
| ORM             | Drizzle ORM                                         |
| Auth            | NextAuth.js + Azure AD B2C (for OEM SSO later)      |
| Monorepo        | Turborepo + pnpm workspaces                         |
| IaC             | Terraform (Azure provider)                          |
| CI/CD           | GitHub Actions                                      |
| Target OEMs     | OEM-agnostic (mock data first) -> VW Group          |
| Team model      | Growing team                                        |
| Pkg namespace   | `@kaz/*`                                            |

---

## Repository Structure

```
kazindustries/
├── apps/
│   ├── api/                    # Express API server
│   ├── web/                    # Next.js dashboard
│   ├── worker/                 # Background job processor (BullMQ)
│   └── simulator/              # OEM data simulator (dev tool)
├── packages/
│   ├── db/                     # Drizzle schemas, migrations, seeds
│   ├── signal-trust/           # Signal Trust Layer core engine
│   ├── orchestration/          # Service Orchestration engine
│   ├── forensics/              # Telemetry Forensics engine
│   ├── warranty/               # Predictive Warranty Shield engine
│   ├── oem-adapters/
│   │   ├── core/               # Abstract adapter interface
│   │   ├── mock/               # Mock OEM data generator
│   │   └── vw-group/           # VW/Audi/Skoda adapter (later)
│   ├── dtc-registry/           # DTC code mapping + knowledge base
│   ├── shared/                 # Shared types, utils, constants
│   └── ui/                     # Shared React UI component library
├── infra/
│   ├── terraform/              # Azure infrastructure
│   ├── docker/                 # Dockerfiles, compose
│   └── k8s/                    # AKS manifests (later)
├── docs/                       # Technical documentation
├── tools/                      # Dev scripts, data generators
├── PLAN.md
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Phase Overview

| Phase | Module                      | Duration  | Team     | Cumulative |
| ----- | --------------------------- | --------- | -------- | ---------- |
| 0     | Foundation + Signal Trust   | 4 weeks   | 2 devs   | Week 4     |
| 1     | Service Orchestration Layer | 8 weeks   | 2-3 devs | Week 12    |
| 2     | Telemetry Forensics         | 7 weeks   | 3-4 devs | Week 19    |
| 3     | Predictive Warranty Shield  | 11 weeks  | 3-5 devs | Week 30    |
| 4+    | Extensions                  | Ongoing   | 4-6 devs | --         |

**First pilot-ready demo (Phase 0+1): ~12 weeks**
**Full platform (through Phase 3): ~30 weeks (~7.5 months)**

---

## PHASE 0: Foundation + Signal Trust Layer

**Duration:** 3-4 weeks (2 devs)

**Goal:** Project scaffold, database design, OEM data simulation, and the
invisible-but-critical Signal Trust Layer that makes everything repeatable.

> Research finding: "Without this layer, every deployment becomes a brittle custom project."

---

### Sub-phase 0.1 — Project Scaffold (Week 1)

**Build:**

- Turborepo monorepo with pnpm workspaces
- Express API app with router/middleware structure
  - Request validation (zod)
  - Error handling middleware
  - Request logging (pino)
  - CORS, helmet, rate limiting
- Next.js web app with basic layout shell
- BullMQ worker app
- Shared packages skeleton (`@kaz/db`, `@kaz/shared`, `@kaz/ui`)
- Docker Compose for local dev (PG + TimescaleDB extension + Redis)
- GitHub Actions CI pipeline (lint, typecheck, test, build)
- Terraform base for Azure (Resource Group, Azure Database for PG, Azure Cache for Redis)
- ESLint + Prettier + Husky pre-commit hooks
- Environment config system (dotenv + zod validation)

**Demo 0.1:**

Monorepo runs locally. CI passes green. All apps start. API returns health check at
`GET /health`. Docker Compose brings up the full local stack with one command.

---

### Sub-phase 0.2 — Database Foundation (Week 1-2)

**Build:**

Core PostgreSQL schema via Drizzle ORM:

**Core tables:**

```
organizations       Multi-tenant OEM accounts
users                Auth, roles, org membership
vehicles             VIN, make, model, year, build_number, software_version, oem_id
oem_connections      OEM source config, adapter type, credentials, status
signal_definitions   Signal name, unit, range, source system, normalization rules
dtc_codes            Code, system, subsystem, severity, description, known_causes
service_history      Vehicle, event_type, timestamp, depot, technician, outcome
parts_catalog        Part number, name, system, subsystem, cost, lead_time
depots               ID, name, location, capacity, bay_count, operating_hours
technicians          ID, name, depot_id, skill_certifications, availability
```

**TimescaleDB hypertables (time-series):**

```
vehicle_signals      vehicle_id, signal_name, value, timestamp  (partitioned by time)
vehicle_events       vehicle_id, event_type, dtc_code, severity, timestamp
vehicle_trips        vehicle_id, start, end, distance, route_hash
```

**Redis key design:**

```
vehicle:health:{id}          Cached health score (TTL 60s)
vehicle:location:{id}        Last known position
queue:priority               Sorted set of vehicle priority scores
session:{token}              User session data
```

- Seed scripts with realistic mock data (500 vehicles, 50 depots, 200 technicians)
- Database migration pipeline via Drizzle Kit

**Demo 0.2:**

Database running with seed data. Drizzle Studio shows all tables populated. API can
query vehicles and signals. TimescaleDB time-bucketed queries working.

---

### Sub-phase 0.3 — OEM Adapter + Mock Simulator (Week 2-3)

**Build:**

Abstract OEM adapter interface (`@kaz/oem-adapters/core`):

```typescript
interface OEMAdapter {
  connect(config: OEMConfig): Promise<void>
  fetchVehicles(): AsyncIterable<RawVehicle>
  fetchSignals(vehicleId: string, since: Date): AsyncIterable<RawSignal>
  fetchDTCs(vehicleId: string, since: Date): AsyncIterable<RawDTC>
  subscribeToEvents(handler: EventHandler): Unsubscribe
  disconnect(): Promise<void>
}
```

Mock OEM adapter (`@kaz/oem-adapters/mock`):

- 500 mock vehicles (mix of truck, bus, van, passenger types)
- Realistic signal patterns:
  - Engine coolant temp, oil pressure, battery voltage, fuel level
  - Exhaust gas temp, turbo boost, transmission temp, brake wear
  - Ambient temp, altitude, speed, RPM
- Injected fault scenarios:
  - Gradual degradation (e.g., turbo efficiency dropping 0.5% per day)
  - Sudden failure (immediate critical DTC)
  - Intermittent faults (appears and disappears)
  - Correlated multi-system faults (cooling issue -> engine issue)
- Configurable fleet health distribution:
  - 80% healthy, 15% degrading, 5% critical
- Simulator app that streams data continuously at configurable rate

Data ingestion pipeline:

```
OEM Adapter -> Raw Signal Queue (BullMQ) -> Normalization Worker -> TimescaleDB
```

**Demo 0.3:**

Simulator running and streaming 500 vehicles' telemetry into TimescaleDB in real time.
API endpoint `GET /api/v1/vehicles/:id/signals?last=1h` returns live data. Worker
logs show ingestion throughput.

---

### Sub-phase 0.4 — Signal Trust Core (Week 3-4)

**Build:**

**Signal normalization engine** (`@kaz/signal-trust`):

- Unit conversion and range validation
- Missing data detection and interpolation strategies
- Signal quality scoring per vehicle (completeness, freshness, consistency)
- Outlier detection and flagging (statistical z-score + domain rules)
- Signal freshness tracking (stale data alerts)

**DTC mapping engine** (`@kaz/dtc-registry`):

- ISO 15031 DTC parser (P/B/C/U codes)
- OEM-specific DTC extension support
- DTC-to-subsystem mapping (engine, transmission, brakes, electrical, exhaust, etc.)
- DTC severity classification: informational / warning / critical / safety
- Known cause/remedy lookup table
- DTC relationship mapping (which DTCs commonly appear together)

**VIN decoder:**

- WMI (World Manufacturer Identifier) parsing -> manufacturer
- VDS (Vehicle Descriptor Section) -> model, engine, body type
- VIS (Vehicle Identifier Section) -> year, plant, serial
- Build number and software version linking

**Alert de-duplication engine:**

- Time-window based grouping (same DTC within N minutes = one alert)
- Same-root-cause clustering (related DTCs grouped into one incident)
- Escalation rules (DTC fires N times in M hours -> upgrade severity)
- Alert lifecycle: `NEW -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED`

**Vehicle health score calculator:**

- Composite score (0-100) from:
  - Signal quality weight
  - Active DTC severity weight
  - Service recency weight
  - Degradation trend weight
- Per-subsystem scoring:
  - Engine, Transmission, Brakes, Electrical, Exhaust/Aftertreatment,
    Cooling, Fuel, Steering, Suspension, Body/Cabin
- Trend direction per subsystem: improving / stable / degrading
- Score history stored in TimescaleDB for trend analysis

**Auth system:**

- NextAuth.js with credential provider (email/password)
- Azure AD provider stub (for OEM SSO in later phases)
- Role-based access control:
  - `platform_admin` — full system access
  - `oem_admin` — org-scoped admin
  - `depot_manager` — depot-scoped operations
  - `technician` — assigned work only
  - `viewer` — read-only dashboards
- Multi-tenant isolation (all queries scoped to organization)
- API key management for programmatic/webhook access
- JWT tokens with refresh rotation

**Demo 0.4 — Phase 0 Final (THE FIRST "WOW" DEMO):**

- Login to web dashboard
- See 500 simulated vehicles with health scores (0-100)
- Each vehicle shows:
  - Normalized signal charts (last 24h)
  - Active DTCs with mapped descriptions and severity badges
  - Subsystem health breakdown (engine: 92, brakes: 87, exhaust: 45...)
  - Health trend graph (improving/degrading)
- Signal quality indicators visible per vehicle
- De-duplicated alerts feed (not 500 raw DTCs but 30 meaningful alerts)
- VIN decoded and linked to build/model info
- Fleet-wide health distribution chart

**Raw noisy data goes in. Clean, scored, explainable fleet comes out.**

---

## PHASE 1: Service Orchestration Layer

**Duration:** 8 weeks (2-3 devs)

**Goal:** The AI dispatcher. Answers: *"Which vehicles need attention first, where
should they be serviced, are parts available, and which technician should handle it?"*

> Research finding: "This should be the starting module. It is the best balance of
> urgency, measurable ROI, and implementation speed."

---

### Sub-phase 1.1 — Vehicle Priority Engine (Week 5-6)

**Build:**

Priority scoring algorithm — ranks vehicles by weighted composite:

| Factor              | Description                                              | Default Weight |
| ------------------- | -------------------------------------------------------- | -------------- |
| Safety urgency      | Brake/steering/tire DTCs weighted highest                | 30%            |
| Failure proximity   | Degradation trend velocity (how fast is it getting worse)| 25%            |
| Business impact     | Cargo value, route criticality, SLA obligations          | 20%            |
| Downtime cost       | Estimated cost per hour of this vehicle off-road         | 15%            |
| Service window      | Time until next natural stop (depot visit, driver rest)  | 10%            |

- Configurable priority weights per organization
- Priority queue in Redis sorted set for real-time ranking
- Priority change events pushed via WebSocket (Server-Sent Events)
- Manual override capability (depot manager can bump a vehicle)

API endpoints:

```
GET    /api/v1/orchestration/priority-queue       Paginated, filterable queue
GET    /api/v1/orchestration/vehicles/:id/priority Single vehicle priority breakdown
PATCH  /api/v1/orchestration/vehicles/:id/priority Manual override
GET    /api/v1/orchestration/priority-queue/stream SSE real-time updates
```

**Demo 1.1:**

Dashboard shows a ranked priority queue of all 500 vehicles. Click any vehicle to
see **why** it's ranked where it is (visual breakdown of each scoring factor).
Queue re-ranks in real-time as simulator generates new signals. Degrading vehicles
climb the queue visibly.

---

### Sub-phase 1.2 — Depot & Workshop Management (Week 6-7)

**Build:**

Depot management module:

- Depot profiles: location (lat/lng), operating hours, specializations
- Service bay tracking: total, occupied, available, out-of-service
- Bay type classification: general, engine, electrical, body, inspection, EV
- Real-time capacity calculation (available bays / total bays)
- Depot load forecast (upcoming bookings vs capacity over next 7 days)

Vehicle-to-depot matching algorithm:

- Nearest depot by vehicle last-known location (haversine distance)
- Depot capability match (can this depot handle this fault type?)
- Depot load balancing (avoid overloading the closest depot)
- Estimated travel time / distance
- Returns top 3 depot recommendations with reasoning

Dashboard views:

- Depot network map (pins with capacity color coding)
- Individual depot detail page:
  - Capacity utilization gauge
  - Incoming vehicle queue
  - Bay allocation board (Kanban-style: Available / Occupied / Maintenance)
  - Upcoming schedule
- Network-wide depot comparison table

API endpoints:

```
GET    /api/v1/depots                       List all depots
GET    /api/v1/depots/:id                   Depot detail + current capacity
GET    /api/v1/depots/:id/bays              Bay status list
PATCH  /api/v1/depots/:id/bays/:bayId       Update bay status
GET    /api/v1/depots/:id/schedule          Upcoming schedule
GET    /api/v1/orchestration/vehicles/:id/depot-match   Top 3 depot recommendations
```

**Demo 1.2:**

Dashboard shows depot network on a map. Each depot displays real-time capacity.
Click a vehicle in the priority queue to see its top 3 recommended depots with
distance, capacity, capability match, and reasoning.

---

### Sub-phase 1.3 — Parts Availability Engine (Week 7-8)

**Build:**

Parts inventory model:

- Per-depot stock levels (part_number, depot_id, quantity, reorder_point)
- Part-to-fault mapping: which DTCs/failure modes require which parts
- Reorder points and lead times per part
- Alternative/substitute parts mapping
- Part criticality classification (safety-critical, operational, cosmetic)

Parts availability check:

- Per service recommendation:
  - "Vehicle X needs part Y -> Depot A has 3, Depot B has 0, warehouse has 12"
- Integrates into depot matching (depots without required parts rank lower)
- Part reservation system (soft-lock when vehicle is assigned to depot)
- Reservation expiry (auto-release if service not started within N hours)

Parts pre-positioning engine:

- Analyze fleet-wide fault trends
- Predict which parts will be needed at which depots in next 7-14 days
- Generate pre-positioning suggestions:
  - "DTC P0217 trending in Region North -> move 15x coolant sensors to Depot 7"
- Suggestion acceptance/rejection tracking

API endpoints:

```
GET    /api/v1/parts                                  Part catalog
GET    /api/v1/parts/:partNumber/availability          Stock across all depots
GET    /api/v1/depots/:id/inventory                    Depot inventory
POST   /api/v1/parts/reservations                      Reserve parts for service
DELETE /api/v1/parts/reservations/:id                  Release reservation
GET    /api/v1/orchestration/parts/pre-positioning     Pre-positioning suggestions
```

**Demo 1.3:**

Vehicle priority queue now shows parts status alongside depot recommendation.
Green = all parts in stock at recommended depot. Yellow = some parts need transfer.
Red = parts backordered. Pre-positioning suggestion cards appear when fault trends
are detected.

---

### Sub-phase 1.4 — Technician Assignment (Week 8-9)

**Build:**

Technician profiles:

- Skill certifications: engine, transmission, electrical, diagnostics,
  aftertreatment, EV/hybrid, body, general maintenance
- Current workload (active assignments count)
- Schedule/availability calendar
- Historical metrics:
  - Fix rate per fault type
  - Average repair time per fault type
  - First-time-fix percentage
  - Customer satisfaction scores (if available)

Assignment algorithm:

- Match technician skills to required fault type
- Filter by availability in the proposed service window
- Rank by:
  - Skill match score (certified in exact subsystem = highest)
  - Historical success rate for similar faults
  - Current workload (fairness distribution)
  - Depot assignment (prefer technicians already at the recommended depot)
- Generate recommendation with confidence score and reasoning

Technician workload dashboard:

- Current assignments per technician
- Upcoming queue
- Skill utilization metrics (are we under-using specialized skills?)
- Workload distribution fairness chart

API endpoints:

```
GET    /api/v1/technicians                             List technicians
GET    /api/v1/technicians/:id                         Technician profile + stats
GET    /api/v1/technicians/:id/assignments             Current and upcoming work
GET    /api/v1/orchestration/vehicles/:id/tech-match   Recommended technician(s)
```

**Demo 1.4:**

Service recommendation for a priority vehicle now includes:
"Recommended technician: Rajesh K. (Depot 3) because: certified in aftertreatment
systems, 94% first-time-fix rate on P0420 faults, currently 2/5 workload capacity."
Technician dashboard shows workload distribution across the depot network.

---

### Sub-phase 1.5 — Service Workflow Engine (Week 9-10)

**Build:**

Service request lifecycle state machine:

```
DETECTED -> PRIORITIZED -> DEPOT_ASSIGNED -> PARTS_CONFIRMED ->
TECHNICIAN_ASSIGNED -> SCHEDULED -> IN_PROGRESS -> COMPLETED -> CLOSED
```

- Transition rules and validations per state
- Auto-creation from priority engine when threshold exceeded
- Manual creation by depot managers
- Assignment acceptance/rejection by depot manager
- Rescheduling and reassignment capabilities

Completion recording (the feedback loop):

- What was actually wrong? (confirmed fault vs detected fault)
- What parts were actually used?
- How long did repair take?
- Was the initial diagnosis correct?
- Was it a first-time-fix or repeat visit?
- Technician notes (free text)

**Outcome feedback loop:**

- Service outcomes feed back into:
  - Priority scoring accuracy (was the urgency rating correct?)
  - DTC-to-fault mapping refinement
  - Technician skill ratings
  - Parts consumption patterns
  - Health score model calibration

SLA tracking:

- Time from detection to depot assignment
- Time from assignment to service start
- Time from service start to completion
- Total detection-to-resolution time
- SLA breach alerting

Notification system:

- WebSocket / SSE real-time updates on dashboard
- Email notifications for assignments, escalations, SLA breaches
- Webhook support for external system integration
- Notification preferences per user role

API endpoints:

```
GET    /api/v1/service-requests                    List (filterable by status, depot, etc.)
POST   /api/v1/service-requests                    Create manually
GET    /api/v1/service-requests/:id                Detail view
PATCH  /api/v1/service-requests/:id/status         Transition state
POST   /api/v1/service-requests/:id/complete       Record completion + outcome
GET    /api/v1/service-requests/:id/timeline       Full audit trail
POST   /api/v1/webhooks                            Register external webhook
```

**Demo 1.5:**

Full service orchestration workflow end-to-end:

1. Simulator generates a degrading vehicle (turbo efficiency dropping)
2. Signal Trust Layer detects degradation, scores health dropping
3. Priority engine ranks it #3 in the queue with reasoning
4. System recommends Depot 7 (nearest with capability + parts + capacity)
5. Parts availability confirmed (turbo kit in stock)
6. Recommended technician: Rajesh K. (aftertreatment specialist)
7. Depot manager accepts assignment on dashboard
8. Technician completes service, records outcome
9. Vehicle health score jumps back to 95
10. Dashboard shows complete audit trail with timestamps

---

### Sub-phase 1.6 — Orchestration Dashboard Polish (Week 11-12)

**Build:**

**Fleet Overview page:**

- Map view with vehicle positions and health-colored pins
- Fleet health distribution donut chart
- Active alerts feed (scrolling, filterable)
- Key metric cards:
  - Vehicles needing service (count + trend)
  - Average turnaround time (hours + trend)
  - First-time-fix rate (% + trend)
  - Bay utilization (% + trend)
  - Open service requests by status

**Priority Queue page:**

- Sortable, filterable, searchable table
- Quick-action buttons (assign, override, dismiss)
- Inline vehicle health preview on hover
- Bulk operations (assign multiple vehicles to same depot)

**Vehicle Detail page:**

- Signal timeline charts (interactive, zoomable)
- DTC history timeline
- Service history table
- Health trend graph (30/60/90 day)
- Current recommendation card
- Subsystem health radar chart

**Depot Management page:**

- Map + list toggle view
- Bay allocation Kanban board (drag-and-drop)
- Capacity forecast chart
- Incoming vehicle queue
- Depot performance metrics

**Service Workflow Board:**

- Kanban view by status
- Calendar view for scheduled services
- List view with advanced filters
- Service request detail modal

**Reports page:**

- Service turnaround time trends (line chart)
- Bay utilization by depot (bar chart)
- Parts consumption by category (pie chart)
- Technician workload distribution (bar chart)
- Fleet health trend (area chart)
- Date range selectors, export to CSV/PDF

**Settings page:**

- Priority weight configuration (sliders)
- Notification preferences
- Depot configuration
- User management
- API key management
- OEM connection management

**UI polish:**

- Dark mode toggle
- Responsive design (tablet-friendly for depot managers)
- Loading skeletons
- Error boundaries with retry
- Keyboard shortcuts for power users
- Toast notifications for real-time events

**Demo 1.6 — Phase 1 Final ("PILOT-READY"):**

A complete, polished platform that a depot manager or service head could use daily.
This is the demo you show an OEM for a **paid pilot**. Every screen drives a decision.
No vanity dashboards — every view leads to an action.

---

## PHASE 2: Telemetry Forensics

**Duration:** 7 weeks (3-4 devs)

**Goal:** The AI detective. Answers: *"Why are these failures happening across vehicle
cohorts, routes, suppliers, and batches? What is the smallest containment action?"*

> Research finding: "Telemetry Forensics is strategically valuable and hard to copy
> once it works." Uses service and repair data already accumulated from Phase 1.

---

### Sub-phase 2.1 — Cohort Analysis Engine (Week 13-15)

**Build:**

Vehicle cohorting system — group vehicles by any combination of:

- Build batch / manufacturing date range
- Software version
- Component supplier (requires supplier metadata ingestion)
- Operating region / route type
- Duty cycle profile (highway, urban, mixed, off-road)
- Model variant / configuration
- Service depot affiliation
- Fleet operator

Cohort comparison analytics:

- Fault rate per cohort vs fleet-wide baseline
- Mean time between failures (MTBF) per cohort
- Signal pattern differences between cohorts
- Distribution comparison (histograms, box plots)

Statistical rigor:

- Chi-squared test for fault rate differences
- Mann-Whitney U test for signal distribution differences
- Bonferroni correction for multiple comparisons
- Confidence intervals on all comparisons
- Minimum sample size warnings

Anomalous cohort auto-detection:

- Background job scans all natural cohorts daily
- Flags cohorts that deviate significantly from baseline
- Ranks anomalies by severity and affected vehicle count
- Example output: "Batch 2024-Q3 has 3.2x more P0420 faults than fleet average
  (p < 0.001, n=142 vehicles)"

Dashboard:

- Cohort explorer: create custom cohorts with filter builder
- Side-by-side cohort comparison view
- Auto-detected anomalous cohorts feed
- Drill-down: click a cohort to see its full fault profile

API endpoints:

```
POST   /api/v1/forensics/cohorts                 Create custom cohort
GET    /api/v1/forensics/cohorts                  List cohorts
GET    /api/v1/forensics/cohorts/:id              Cohort detail + statistics
GET    /api/v1/forensics/cohorts/:id/compare      Compare to baseline or another cohort
GET    /api/v1/forensics/anomalies                Auto-detected anomalous cohorts
```

**Demo 2.1:**

Dashboard shows 5-8 auto-detected anomalous cohorts from simulated data. Click
"Batch 2024-Q3 vehicles" to see its fault profile vs fleet baseline. Clear
visualization: "This batch has 3.2x aftertreatment failures, statistically
significant."

---

### Sub-phase 2.2 — Failure Pattern Detection (Week 15-17)

**Build:**

**Temporal pattern mining:**

- DTC sequence analysis:
  - "P0171 followed by P0300 within 14 days in 67% of cases"
  - Sequential pattern mining on DTC event streams
- Signal degradation pattern matching:
  - Template-based matching (known degradation curves)
  - Dynamic Time Warping for similar-but-shifted patterns
- Seasonal/environmental correlation:
  - Temperature, humidity, altitude vs fault rate
  - Monsoon season patterns, extreme heat patterns

**Spatial pattern mining:**

- Route-correlated failures:
  - Specific roads, terrain types, altitude changes
  - Fuel station correlation (fuel quality issues)
- Region-level failure clustering
- Heatmap generation for geographic fault distribution

**Cross-system correlation:**

- Inter-subsystem fault correlation:
  - "Aftertreatment failures correlate with fuel quality signals in Region X"
  - "Turbo failures 2x more common in vehicles with software < v3.2"
  - "Battery drain correlates with specific alternator supplier batch"
- Correlation strength scoring (Pearson, Spearman, mutual information)
- Spurious correlation filtering (require temporal precedence + domain plausibility)

**Pattern management:**

- Pattern confidence scoring
- False-positive rate tracking
- Pattern library: confirmed patterns become reusable detection rules
- Pattern status lifecycle: `DETECTED -> UNDER_REVIEW -> CONFIRMED -> ACTIVE -> RETIRED`

Dashboard:

- Pattern visualization: connected chains showing DTC/signal sequences
- Geographic heatmap of failure patterns
- Cross-system correlation matrix
- Pattern library browser

API endpoints:

```
GET    /api/v1/forensics/patterns                  Detected patterns
GET    /api/v1/forensics/patterns/:id              Pattern detail + evidence
PATCH  /api/v1/forensics/patterns/:id/status       Confirm/reject pattern
GET    /api/v1/forensics/correlations              Cross-system correlations
GET    /api/v1/forensics/heatmap                   Geographic failure heatmap data
```

**Demo 2.2:**

Interactive failure pattern visualization. Shows: "P0171 (lean mixture) -> P0300
(misfire) -> P0420 (catalyst efficiency) — this chain appears in 67% of
aftertreatment failures, predominantly in Region North." Geographic heatmap
highlights concentration.

---

### Sub-phase 2.3 — Root Cause Analysis & Investigation Workflow (Week 17-19)

**Build:**

**Investigation workflow:**

```
PATTERN_DETECTED -> INVESTIGATION_OPENED -> EVIDENCE_COLLECTED ->
ROOT_CAUSE_IDENTIFIED -> CONTAINMENT_RECOMMENDED -> ACTION_TAKEN -> VERIFIED
```

**Evidence collection engine:**

- Auto-pulls relevant data when investigation opens:
  - Affected vehicles list with VINs
  - Signal timelines for affected vs unaffected vehicles
  - DTC history for affected cohort
  - Service records for affected vehicles
  - Build/batch/supplier metadata
  - Environmental context (region, season, duty cycle)
- Structures evidence into a coherent package
- Cites specific VINs and data points (not just anomaly scores)

**Containment recommendation engine:**

Classifies recommended response type:

| Response Type       | When to use                                    |
| ------------------- | ---------------------------------------------- |
| Monitor             | Low confidence, small cohort, low severity     |
| Service campaign    | Medium cohort, fixable at depot, non-safety     |
| Software update     | Root cause is calibration/software related      |
| Supplier escalation | Root cause traces to supplier batch/component   |
| Training bulletin   | Root cause is operational/driver behavior       |
| Safety recall       | Safety-critical, large cohort, high confidence  |

For each recommendation:

- Estimated affected vehicle count
- Estimated cost of action vs cost of inaction
- Urgency classification
- Generated affected VIN list
- Suggested timeline

**Supplier scorecard:**

- Fault rates by component supplier
- Trend tracking per supplier (improving/worsening)
- Comparative view: multiple suppliers for same component type
- Batch-level drill-down within supplier

**Investigation report generator:**

- Auto-generated structured report (markdown + PDF export)
- Sections: summary, methodology, evidence, root cause, recommendation, affected VINs
- Cites specific data evidence (not just "AI detected an anomaly")
- Suitable for: management review, regulatory filing, supplier negotiation

Dashboard:

- Investigation board (Kanban by status)
- Investigation detail page with evidence viewer
- Supplier scorecard page
- Report viewer + export

API endpoints:

```
POST   /api/v1/forensics/investigations            Open investigation
GET    /api/v1/forensics/investigations             List investigations
GET    /api/v1/forensics/investigations/:id         Investigation detail
PATCH  /api/v1/forensics/investigations/:id/status  Transition status
GET    /api/v1/forensics/investigations/:id/evidence Evidence package
GET    /api/v1/forensics/investigations/:id/report  Generated report
GET    /api/v1/forensics/suppliers/scorecards       Supplier scorecards
```

**Demo 2.3 — Phase 2 Final:**

Complete forensics workflow:

1. System detects anomalous cohort (Batch 2024-Q3, aftertreatment faults)
2. Investigation opened automatically
3. Evidence collected: 142 affected VINs, signal timelines, DTC chains,
   supplier metadata showing Component Supplier B's batch #4471
4. Root cause identified: supplier batch quality deviation
5. Containment recommendation: service campaign for 142 vehicles,
   supplier escalation for batch #4471
6. Report generated with full evidence citations
7. Supplier scorecard updated showing Supplier B's declining trend

---

## PHASE 3: Predictive Warranty Shield

**Duration:** 11 weeks (3-5 devs)

**Goal:** Predict which vehicles are heading toward expensive warranty events
and find the cheapest intervention window before the failure occurs.

> Research finding: "Shield is the highest-value module but also the hardest to
> validate quickly. Build it after you already have data quality, service workflows,
> and closed-loop feedback."

---

### Sub-phase 3.1 — Historical Failure Labeling (Week 20-23)

**Build:**

**Warranty event data model:**

```
warranty_claims      Vehicle, component, failure_mode, cost, date, resolution
goodwill_repairs     Vehicle, component, cost, date, reason
campaigns            Campaign_id, type, affected_VINs, cost, status
interventions        Vehicle, type, date, cost, was_proactive, outcome
```

**Outcome labeling pipeline:**

- Link warranty claims to prior telemetry signals
  - For each claim: look back N days in signal/DTC history
  - Label the "pre-failure window" (signals before failure)
- Build training datasets:
  - Positive examples: vehicles that failed (with pre-failure signal window)
  - Negative examples: similar vehicles that did NOT fail
  - Time-aligned feature snapshots
- Handle class imbalance (failures are rare events)
  - SMOTE or similar oversampling for training
  - Maintain natural distribution for evaluation

**Failure mode catalog:**

- Top 20 most expensive failure modes ranked by:
  - Total warranty cost
  - Frequency
  - Average cost per claim
  - Trend direction (increasing/decreasing)
- Cost distribution per failure mode
- Time-to-failure distribution (Weibull analysis)
- Training readiness per failure mode (enough labeled data? enough features?)

**Data quality dashboard:**

- Label completeness metrics per failure mode
- Training set size indicators (minimum threshold markers)
- Data freshness tracking
- Feature availability matrix (which signals available for which vehicles)

**Demo 3.1:**

Dashboard showing warranty cost landscape:
- Top 20 failure modes ranked by total cost (bar chart)
- Click a failure mode to see its cost distribution and time-to-failure curve
- Training readiness indicators: "Turbo failure — 847 labeled events, 14 features
  available, READY for model training"
- "EGR valve — 23 labeled events, INSUFFICIENT data"

---

### Sub-phase 3.2 — Prediction Models (Week 23-27)

**Build:**

**Feature engineering pipeline:**

Signal aggregation features (per vehicle, per time window):

- Mean, std, min, max, median of each signal
- Trend slope (linear regression over window)
- Rate of change (first derivative)
- Volatility (coefficient of variation)
- Signal quality features (missing data ratio, outlier ratio)

DTC features:

- DTC count by severity in last 7/30/90 days
- DTC recency (days since last critical DTC)
- DTC diversity (unique DTC codes in window)
- Specific high-risk DTC presence flags

Service history features:

- Days since last service
- Cumulative repair count (total and by subsystem)
- Was last repair a repeat visit?
- Service regularity score

Duty cycle features:

- Average daily distance
- Load profile percentiles
- Terrain mix (highway/urban/off-road ratios)
- Operating temperature range
- Idle time ratio

Vehicle metadata features:

- Age (months since registration)
- Total mileage
- Software version recency
- Build batch

**Model infrastructure:**

- Feature store (precomputed, versioned feature snapshots in PostgreSQL)
- Model training pipeline (Node.js orchestration + Python model training via subprocess)
- Model types:
  - Gradient boosted classifier (XGBoost via Python): P(failure in next N days)
  - Survival analysis (Cox PH or Random Survival Forest): time-to-failure estimate
  - Isolation Forest: anomaly detection for unknown failure modes
- Model versioning and experiment tracking (MLflow or custom)
- Model evaluation framework:
  - Precision/recall at various thresholds
  - Calibration curves
  - Time-dependent AUC
  - Lift charts
- A/B testing framework for model comparison

**Prediction API:**

```
GET /api/v1/warranty/vehicles/:id/risk
```

Response:

```json
{
  "vehicleId": "VIN123",
  "overallRiskScore": 0.73,
  "riskLevel": "HIGH",
  "componentRisks": [
    {
      "component": "turbocharger",
      "failureProbability": 0.81,
      "estimatedDaysToFailure": 45,
      "confidence": 0.72,
      "topContributingFactors": [
        { "feature": "turbo_boost_pressure_trend", "impact": -0.23 },
        { "feature": "exhaust_gas_temp_volatility", "impact": 0.18 },
        { "feature": "mileage_since_last_service", "impact": 0.12 }
      ]
    }
  ]
}
```

**False positive management:**

- Configurable alert thresholds per failure mode
- Alert fatigue metrics (how many predictions per week?)
- Precision/recall trade-off controls in settings
- "Snooze" capability for known-acceptable situations

API endpoints:

```
GET    /api/v1/warranty/fleet-risk                Fleet-wide risk overview
GET    /api/v1/warranty/vehicles/:id/risk         Per-vehicle risk breakdown
GET    /api/v1/warranty/risk-distribution         Risk score distribution
GET    /api/v1/warranty/models                    Active models and versions
GET    /api/v1/warranty/models/:id/performance    Model performance metrics
```

**Demo 3.2:**

Fleet risk heatmap — every vehicle colored by warranty risk (green/yellow/orange/red).
Click a vehicle to see component-level risk breakdown with confidence scores.
"Turbo failure probability: 81% within 45 days. Top factor: boost pressure
declining at -0.23 kPa/day." Model performance dashboard shows precision/recall
curves.

---

### Sub-phase 3.3 — Intervention Optimizer (Week 27-30)

**Build:**

**Intervention window calculator:**

- For each at-risk vehicle + component:
  - Estimated days to failure (from survival model)
  - Next scheduled service date
  - Next natural stop (route endpoint, driver rest)
  - Proactive intervention cost vs warranty claim cost
  - Optimal intervention date (balances urgency, cost, logistics)
- Window visualization: timeline showing current date, intervention window, and
  predicted failure date

**Cost-benefit analyzer:**

| Metric                     | Calculation                              |
| -------------------------- | ---------------------------------------- |
| Proactive repair cost      | Parts + labor + downtime for planned fix |
| Warranty claim cost        | Parts + labor + towing + downtime + goodwill |
| Net savings per vehicle    | Claim cost - proactive cost              |
| Fleet-wide savings         | Sum across all intervened vehicles       |
| ROI                        | Fleet savings / platform cost            |

- Fleet-wide savings projection dashboard
- Historical savings tracker (predicted vs actual)
- ROI calculator for executive reporting

**Campaign builder:**

- Select failure mode -> see all at-risk vehicles ranked by risk
- Define intervention type:
  - Proactive replacement
  - Inspection + conditional replacement
  - Software update
  - Monitoring-only
- Set risk threshold (e.g., only vehicles with P(failure) > 0.7)
- Generate affected VIN list with:
  - Risk score
  - Recommended intervention date
  - Nearest capable depot
  - Estimated cost
- Track campaign execution:
  - VINs intervened vs outstanding
  - Actual costs vs estimates
  - Post-intervention health score changes

**Warranty cost avoidance tracker:**

- Running tally of prevented warranty costs
- Per-campaign savings breakdown
- Model accuracy tracking:
  - Of vehicles we predicted would fail and intervened: how many would have failed?
  - Of vehicles we predicted would NOT fail: how many actually failed? (misses)
- Monthly/quarterly warranty cost trend vs baseline

Dashboard:

- Fleet risk heatmap
- Intervention timeline (Gantt-style per vehicle)
- Campaign management board
- Savings tracker with running totals
- Model accuracy scorecard
- Executive summary view (ROI-focused)

API endpoints:

```
GET    /api/v1/warranty/interventions/windows     Intervention windows for at-risk vehicles
POST   /api/v1/warranty/campaigns                 Create campaign
GET    /api/v1/warranty/campaigns                 List campaigns
GET    /api/v1/warranty/campaigns/:id             Campaign detail + progress
PATCH  /api/v1/warranty/campaigns/:id/vehicles/:vid  Update vehicle intervention status
GET    /api/v1/warranty/savings                   Cost avoidance tracker
GET    /api/v1/warranty/executive-summary         Executive ROI summary
```

**Demo 3.3 — Phase 3 Final:**

End-to-end warranty prevention:

1. System predicts turbo failures in 47 vehicles within 60 days
2. Intervention window calculated: optimal window is 15-30 days from now
3. Cost analysis: proactive fix = avg 35K/vehicle, warranty claim = avg 2.8L/vehicle
4. Campaign created: "Turbo Proactive Replacement Q2-2027"
5. VIN list generated with risk scores, recommended dates, nearest depots
6. Campaign tracks execution as vehicles are serviced
7. Savings tracker shows: 1.15 Cr avoided across 47 vehicles
8. Model accuracy: 89% of flagged vehicles showed confirmed degradation

---

## PHASE 4+: Platform Extensions (Ongoing)

Built after core modules prove value with paying customers.

---

### 4.1 — Parts Demand & Depot Stock AI

- Use fault predictions + service forecasts to project parts demand 30-60-90 days out
- Auto-generate purchase order suggestions
- Optimize stock allocation across depot network
- Reduce stock-outs and excess inventory simultaneously
- Integration with OEM parts ordering systems

### 4.2 — Recall Precision Engine

- Extension of Telemetry Forensics
- Identify exact VIN cohorts affected by a quality issue
- Reduce shotgun recalls by 40-60% (target only truly affected vehicles)
- Regulatory report generation (SIAM / MoRTH format for India)
- Recall campaign tracking and completion monitoring

### 4.3 — Dealer Technician Copilot

- AI assistant for technicians during diagnosis and repair
- Knowledge base: repair manuals, TSBs, known issues, past repair patterns
- Diagnostic step suggestion based on vehicle symptoms + history
- Similar past repair lookup ("3 other technicians fixed this P0420 by...")
- Voice interface for hands-free workshop use (later)
- Feedback loop: technician ratings improve suggestions

### 4.4 — EV Battery & eAxle Warranty Intelligence

- Specialized prediction models for:
  - Battery State of Health degradation
  - Thermal management anomalies
  - Charging behavior impact on longevity
  - eAxle vibration patterns
- Critical as electric CV/bus fleets scale in India
- Different failure modes and cost structures than ICE

### 4.5 — VW Group OEM Adapter

- Real integration with VW Group APIs:
  - WeConnect (VW)
  - myAudi Connect
  - Skoda Connect
- VW-specific DTC mappings (VAG diagnostic codes)
- VW service interval protocols
- VW parts catalog integration
- VW dealer network mapping

### 4.6 — Telemetry ROI / Selective Logging

- Decide which signals to collect at higher/lower frequency
- Adaptive sampling: healthy vehicle = low frequency, degrading = high frequency
- Cloud cost optimization (less data transfer for healthy fleet)
- Signal value scoring: which signals actually improve predictions?
- Cost-per-prediction tracking

---

## Azure Infrastructure

```
Azure Resource Group: kazindustries-{env}
│
├── Azure Database for PostgreSQL Flexible Server
│   └── TimescaleDB extension enabled
│   └── 4 vCores / 16 GB RAM (production)
│
├── Azure Cache for Redis
│   └── Standard C1 (production)
│
├── Azure Container Apps
│   ├── api          (Express API server)
│   ├── worker       (BullMQ background jobs)
│   └── simulator    (dev/staging only)
│
├── Azure Static Web Apps
│   └── web          (Next.js dashboard)
│
├── Azure Blob Storage
│   ├── reports      (generated investigation reports, PDF exports)
│   ├── models       (ML model artifacts)
│   └── exports      (CSV/data exports)
│
├── Azure Key Vault
│   └── Secrets, API keys, OEM credentials
│
├── Azure Monitor + Application Insights
│   └── Logs, metrics, traces, alerts
│
├── Azure Service Bus (Phase 2+)
│   └── Cross-service messaging, event-driven workflows
│
├── Azure Container Registry
│   └── Docker images for all services
│
└── Azure Front Door (production)
    └── CDN, WAF, global load balancing
```

**Environments:**

| Environment | Purpose                    | Infra level              |
| ----------- | -------------------------- | ------------------------ |
| local       | Developer machine          | Docker Compose           |
| dev         | Integration testing        | Minimal Azure resources  |
| staging     | Pre-production, demos      | Production-like          |
| production  | Live customer deployments  | Full HA, monitoring      |

---

## Key Principles (Non-Negotiable)

1. **No hardware.** Sit above existing telematics.
2. **No generic dashboards.** Every screen must drive a decision or action.
3. **Signal Trust Layer is invisible but sacred.** It makes deployments repeatable.
4. **Working demo at every sub-phase.** No "trust me it works in the backend."
5. **Outcome feedback loops.** Every service completion feeds back into accuracy.
6. **Multi-tenant from day 1.** Organization-scoped data isolation.
7. **OEM-agnostic adapter pattern.** New OEMs = new adapter, not new platform.
8. **Explainability over accuracy.** Every score, ranking, and prediction cites evidence.
9. **Productize the invisible data layer.** The moat is signal normalization, cohorting,
   and workflow memory — not the UI.
10. **One narrow use case first.** Win Service Orchestration, then expand.

---

## Success Metrics by Phase

| Phase | Key Metric                          | Target              |
| ----- | ----------------------------------- | -------------------- |
| 0     | Signal ingestion throughput         | 10K signals/sec      |
| 0     | Health score computation latency    | < 2 seconds          |
| 1     | Service request turnaround time     | Measurably reduced   |
| 1     | First-time-fix rate                 | Tracked, trending up |
| 1     | Bay utilization                     | Tracked, optimized   |
| 2     | Mean time to root cause             | Measurably reduced   |
| 2     | Containment action precision        | > 80%                |
| 3     | Prediction precision (P > 0.7)      | > 75%                |
| 3     | Warranty cost avoidance             | Measurably positive  |
| 3     | False positive rate                 | < 15%                |

---

## Risk Register

| Risk                                   | Mitigation                                         |
| -------------------------------------- | -------------------------------------------------- |
| OEM refuses data access                | OEM-agnostic adapter; start with mock data          |
| Every deployment becomes custom work   | Signal Trust Layer standardization; reusable core   |
| OEM builds it in-house                 | Speed, specialization, cross-system decisioning     |
| Prediction models fail validation      | Start with simple heuristics; ML is an upgrade      |
| Long enterprise sales cycles           | Paid pilots with clear scope and timeline           |
| Team scaling challenges                | Modular architecture; packages can be owned by pods |
| Data quality is too poor               | Signal Trust Layer; quality scoring; fail gracefully |
| Scope creep                            | Phase gates; demo gates; one module at a time       |

---

*Last updated: 15 March 2026*
*Status: APPROVED — Ready for Phase 0 implementation*
