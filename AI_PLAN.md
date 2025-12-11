# AI Plan

## AI-First Orchestration

This platform should treat AI as a core decision layer that operates alongside the deterministic system, not as an optional enhancement.

- The deterministic layer provides fast, reliable baseline outputs for health scoring, prioritization, and operational constraints.
- The AI layer runs side by side with those baselines and reasons across fleet context, historical patterns, resource constraints, and multi-variable interactions.
- Every major orchestration decision should be AI-informed and measurable against deterministic outputs.

## Core Use Cases

### 1. Priority and Triage

- AI reviews high-priority vehicles and adjusts rank based on recurring failures, route criticality, environmental context, and other fleet signals.
- AI should generate explainable urgency labels such as `urgent` and `emergency`.

### 2. Depot Assignment

- AI should recommend the best depot using capacity, parts readiness, technician capability, travel distance, and ETA.
- AI should always provide a primary recommendation and a contingency option.

### 3. Technician Assignment

- AI should predict the technician most likely to achieve a first-time fix using fault-specific history, workload, and skill-fit signals.
- This should outperform simple deterministic skill matching when enough historical data exists.

### 4. Full Dispatch Planning

- AI should produce the full dispatch plan:
  - selected depot
  - selected technician
  - parts to stage
  - ETA and repair-time estimate
  - watch points
  - alternative plan
- This becomes the authoritative dispatch plan shown in the product and pushed downstream.

### 5. Pattern Detection and Fleet Intelligence

- AI should continuously analyze historical telemetry and service outcomes to detect supplier issues, firmware-related failures, geographic patterns, and emerging risk clusters.
- These outputs should feed proactive maintenance and operational planning.

### 6. Reinforcement and Learning

- AI should be evaluated against outcomes such as first-time fix rate, downtime reduction, and SLA adherence.
- Outcome feedback should improve prioritization, dispatch planning, depot selection, and technician assignment over time.

## Operating Model

```text
[Telemetry + Fault Data]
        |
        v
[Deterministic Layer] ------------------> Baseline priority, depot, technician
        |                                       |
        v                                       |
[AI Layer / Agent] -----------------------------|
        |
        v
[Adjusted Decisions + Dispatch Plan] --> Triage Queue / Service Workflow
```

- Both layers run concurrently.
- AI uses deterministic output as context, then adjusts or strengthens the decision with reasoning and contingency planning.
- All decisions must be auditable and stored for evaluation.

## Product Outcome

- AI is a co-pilot built into the orchestration engine, not an add-on.
- Deterministic logic provides reliability and safety.
- AI provides reasoning, adaptability, and optimization.
- The system should measure deterministic vs AI-adjusted performance side by side and use that data to improve future decisions.
