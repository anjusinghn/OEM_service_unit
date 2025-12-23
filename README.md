<p align="center">
  <img src="https://img.shields.io/badge/kazindustries-Service%20Orchestration-6C3FE8?style=for-the-badge&labelColor=0a0a0a" alt="kazindustries" />
</p>

<h1 align="center">kazindustries</h1>

<p align="center">
  <strong>AI-driven service orchestration for commercial vehicle fleets</strong>
</p>

<p align="center">
  Turn vehicle telemetry into intelligent service decisions.<br/>
  Prioritize maintenance. Match vehicles to depots and technicians. Learn from every repair.
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#how-it-works">How It Works</a> &middot;
  <a href="#getting-started">Getting Started</a> &middot;
  <a href="#ai-decision-engine">AI Engine</a> &middot;
  <a href="#architecture">Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-22_LTS-339933?logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TimescaleDB-2.x-FDB515?logo=timescale&logoColor=black" alt="TimescaleDB" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/LangChain-0.3-1C3C3C?logo=langchain&logoColor=white" alt="LangChain" />
  <img src="https://img.shields.io/badge/Turborepo-latest-0F0F0F?logo=turborepo&logoColor=white" alt="Turborepo" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## Why kazindustries?

Fleet operators lose millions to unplanned downtime. A truck breaks down on the highway. A bus needs urgent repairs during peak hours. Without intelligent prioritization, critical vehicles wait while routine maintenance gets attention.

**kazindustries solves this by automating the entire service decision pipeline:**

- **Ingest** telemetry from OEM clouds (Tata Fleet Edge, Ashok Leyland iAlert, Mahindra DiGiSENSE, and more)
- **Score** vehicle health across 8 subsystems in real-time
- **Prioritize** service needs using safety-critical factors, failure proximity, and business impact
- **Recommend** optimal depots based on specialty, parts availability, and distance
- **Match** technicians with the right skills and availability
- **Learn** from every completed service to improve future decisions

The result? Fewer breakdowns. Faster repairs. Higher first-time-fix rates. Lower operational costs.

---

## Features

### 🔧 Real-Time Fleet Health Monitoring

Track the health of every vehicle across 8 critical subsystems: engine, cooling, brakes, turbo, exhaust, electrical, fuel, and transmission. Get instant alerts when vehicles enter critical status. View fleet-wide health distribution and identify patterns before they become problems.

**Key capabilities:**
- Live health scoring (0–100) with trend detection
- Automated fault detection from diagnostic trouble codes (DTCs)
- Multi-vehicle telemetry ingestion from OEM clouds
- Historical signal analysis with TimescaleDB time-series storage

### 🎯 Intelligent Priority Queue

Not all service needs are equal. The priority engine ranks vehicles using a weighted scoring model that considers safety urgency, failure proximity, business impact, downtime cost, and service window availability.

**What makes it smart:**
- Safety-critical faults (brakes, steering) automatically escalate
- Vehicles nearing breakdown get priority over routine maintenance
- Route criticality and cargo value factor into rankings
- Dynamic reprioritization as new telemetry arrives

### 🤖 AI-Powered Dispatch Agent

When a vehicle needs service, the AI dispatch agent gathers context, evaluates options, and produces a complete dispatch plan — not just a recommendation, but a full decision with reasoning.

**The agent considers:**
- Vehicle history and recurring failure patterns
- Depot capacity, specialties, and parts inventory
- Technician certifications, workload, and DTC-specific experience
- Historical outcomes from similar repairs
- Alternative plans if the primary option fails

**The output includes:**
- Recommended depot with ETA and reasoning
- Assigned technician with skill match justification
- Parts to stage before the vehicle arrives
- Estimated repair time and cost
- Watch points and potential complications

### 📊 Decision Intelligence Dashboard

Track how well your service decisions perform over time. The reinforcement learning loop captures outcomes from every completed repair and feeds them back into the system.

**Metrics you get:**
- Decision quality trends (AI + heuristic vs. heuristic-only)
- Priority accuracy, depot match scores, technician assignment success
- Human override rates and patterns
- First-time-fix rates by depot and technician
- Confidence calibration — when the AI says 90% confident, is it right 90% of the time?

### 🗺️ Fleet Command Center

A live operational dashboard that fleet managers actually want to use.

**Visualizations:**
- Interactive fleet map with health-colored vehicle pins
- Real-time priority queue with AI reasoning panels
- Kanban board tracking service requests through the full lifecycle
- Depot network view with capacity gauges and inventory levels
- Live activity feed showing health changes, dispatches, and completions

### 🔌 OEM Integration Ready

Connect to major Indian commercial vehicle OEMs with standardized adapters.

**Supported patterns:**
- **REST API polling** — for Tata Fleet Edge, Ashok Leyland iAlert, and others
- **MQTT streaming** — for real-time telemetry feeds
- **Webhook receivers** — for event-driven fault notifications
- **Mock simulator** — for development and testing with a 96-vehicle synthetic fleet

---

## How It Works

### The Decision Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  1. INGEST                                                      │
│     OEM telematics → Adapter → Normalized signals → Queue       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. SCORE                                                       │
│     Compute health across 8 subsystems → Detect status changes   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. PRIORITIZE                                                  │
│     5-factor weighted scoring → Rank queue → Trigger AI review  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. REASON (AI Layer - Optional)                                │
│     LangChain agent evaluates top candidates → Detect patterns  │
│     → Surface risk factors → Adjust scores with explanations    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. MATCH                                                       │
│     Score depots (specialty, parts, capacity, distance)         │
│     Score technicians (skills, FTF rate, workload, history)     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. DISPATCH                                                    │
│     Fleet manager approves → Service request created → Tracked  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. LEARN                                                       │
│     Record actual outcome → Compute reward signal → Improve AI  │
└─────────────────────────────────────────────────────────────────┘
```

### Service Workflow

Track every service request through its full lifecycle:

```
DETECTED → PRIORITIZED → DEPOT_ASSIGNED → TECH_ASSIGNED
    → PARTS_CONFIRMED → SCHEDULED → IN_PROGRESS
        → COMPLETED → CLOSED
```

Each transition is timestamped for SLA tracking. The completion form captures what actually went wrong, whether the diagnosis was correct, which parts were used, and how long the repair took — all feeding the learning loop.

---

## AI Decision Engine

The AI layer runs on **LangChain.js** and **OpenRouter**, using the `z-ai/glm-4.5-air:free` model. It operates asynchronously — heuristics provide the fast path, AI adds intelligence without blocking operations.

### Reasoning Capabilities

| Capability | What It Does |
|------------|--------------|
| **Priority Review** | Evaluates heuristic rankings, detects recurring failures, surfaces non-obvious risk factors with data-cited explanations |
| **Depot Evaluation** | Assesses depot recommendations against performance history, supply chain risks, and logistical constraints |
| **Technician Matching** | Considers DTC-specific experience, workload balance, and skill gaps beyond certification lists |
| **Full Dispatch Planning** | Multi-step agent that calls tools to gather context and produces complete dispatch plans with alternatives |
| **Escalation Detection** | Periodic scans for SLA risks, batch failure patterns, capacity crunches, and rapid degradation |

### The Dispatch Agent in Action

When you trigger an AI dispatch, the agent:

1. **Fetches vehicle data** — current signals, health scores, active faults
2. **Checks service history** — past repairs, recurring issues, prior technicians
3. **Evaluates depots** — capacity, specialties, parts inventory, distance
4. **Assesses technicians** — certifications, workload, DTC-specific history
5. **Searches similar cases** — how were similar faults resolved historically
6. **Generates a plan** — depot, technician, parts, timeline, cost, watch points

The entire reasoning trace is visible in the dashboard. You see exactly what the AI considered and why it made each recommendation.

### Graceful Degradation

```
AI enabled + responds in time  → Merge AI insights with heuristics
AI enabled + timeout (>15s)    → Use heuristics, queue AI retry
AI enabled + error             → Use heuristics, show "AI unavailable"
AI disabled                    → Pure heuristic mode, fully functional
```

The system never depends on AI. Heuristics are the foundation. AI is an enrichment layer.

---

## Getting Started

### Prerequisites

- **Node.js** 22+ (LTS)
- **pnpm** 10+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker** + Docker Compose

### Quick Start

```bash
# 1. Clone and install
git clone https://github.com/kaizen403/OEM_service_unit.git
cd OEM_service_unit
pnpm install

# 2. Set up environment
cp .env.example .env

# 3. Start infrastructure (PostgreSQL/TimescaleDB + Redis)
pnpm infra:up

# 4. Set up database
pnpm --filter @kaz/db db:push    # Apply schema
pnpm --filter @kaz/db db:seed    # Seed with 96 vehicles, 6 depots, 50 technicians

# 5. Run everything
pnpm dev
```

**Services start at:**
- Dashboard: http://localhost:3000
- API: http://localhost:4000
- Queue monitoring: http://localhost:4000/admin/queues

### Enable AI (Optional)

Add your [OpenRouter API key](https://openrouter.ai/keys) to `.env`:

```env
AI_ENABLED=true
OPENROUTER_API_KEY=sk-or-...
```

The platform works fully without AI — heuristic scoring handles all core functionality.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        OEM TELEMATICS CLOUDS                            │
│   Tata CV │ Ashok Leyland │ Mahindra │ Eicher │ Mock Simulator          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER (Normalize & Queue)                    │
│         REST Poller │ MQTT Subscriber │ Webhook │ Mock Generator        │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKER CLUSTER (BullMQ + Redis)                      │
│                                                                          │
│   Signal Ingest → Health Compute → Priority Rank → AI Reasoning         │
│   Fault Process → Depot Match → Tech Match → Notifications              │
│   Reward Compute (learning loop)                                        │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
           ┌─────────────┴─────────────┐
           ▼                           ▼
┌─────────────────────┐      ┌──────────────────┐
│  PostgreSQL 16      │      │     Redis 7      │
│  + TimescaleDB      │      │                  │
│                     │      │  Cache, pub/sub, │
│  Operational data   │      │  queues, sessions│
│  Time-series telemetry                     │
│  Decision logs      │      └────────┬─────────┘
│  Reward signals     │               │
└─────────────────────┘               ▼
                            ┌──────────────────┐
                            │   Real-time SSE  │
                            │   Dashboard feed │
                            └────────┬─────────┘
                                     │
    ┌────────────────────────────────┴────────────────────────────────┐
    │              API + DASHBOARD (Express + Next.js)                 │
    │                                                                  │
    │  REST API │ SSE Stream │ Bull Board │ Fleet Command Center      │
