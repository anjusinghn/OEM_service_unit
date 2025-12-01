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
| **Technician Roster** | Depot staffing, certifications, workload capacity, first-time-fix performance | — | ✅ |
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
│  │  └─ Emit job → queue:depot-match (top 16)                                │   │
│  │                                                                          │   │
│  │  AIReasoningProcessor                                                    │   │
│  │  ├─ Call OpenRouter via LangChain (priority reasoning chain)             │   │
│  │  ├─ Store AI assessment alongside heuristic score in PostgreSQL          │   │
│  │  ├─ Cache AI response in Redis (ai:priority:{vehicleId}, TTL 300s)       │   │
│  │  └─ Publish event → Redis pub/sub channel                                │   │
│  │                                                                          │   │
│  │  DepotMatchProcessor                                                     │   │
