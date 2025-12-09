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
