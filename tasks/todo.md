# Greater Chennai simulation implementation checklist

## 1. Load the same regional scenario into the seed and simulator

- [x] Record both service addresses and source links. Label Madhavaram's pin as approximate and workshop operations as synthetic.
- [ ] Verify Madhavaram’s exact workshop entrance and confirm model-specific heavy truck eligibility at each site.
- [x] Add one selectable scenario with stable vehicle and workshop IDs, route waypoints, inventory, bay schedules, technicians, and scripted faults.
- [x] Load it into an isolated demo database and simulator. Every telemetry vehicle and depot assignment resolves to a seeded record. Restarting or reseeding the demo leaves the current nationwide demo intact.

**Verification.** Validate fixture IDs and coordinates, seed the isolated database twice, and check the depot and fleet endpoints against the fixture.

**Likely code.** Scenario fixture, `packages/db/src/seed.ts`, `packages/oem-adapters/mock/src/index.ts`, `apps/simulator/src/index.ts`.

**Dependencies.** None.

## 2. Make routes and telemetry repeatable

- [x] Advance trucks along scenario waypoints and make the current position available to depot matching, using the existing ingestion path.
- [x] Generate readings around healthy baselines with bounded variation. Drive fault severity with scripted changes rather than cumulative sensor drift.
- [x] Verify that a fixed seed and clock reproduce the same readings, route positions, fault transitions, and priority order. The cooling case appears in triage without turning unrelated vehicles critical.

**Verification.** Run a reproducibility test and a 1,000-tick run. Assert sensor ranges, route bounds, monotonic mileage, the expected fault progression, and mostly healthy vehicles.

**Likely code.** `packages/oem-adapters/mock/src/index.ts`, simulator tick logic, shared telemetry types if needed, signal ingestion and health scoring.

**Dependencies.** Task 1.

**Checkpoint.** The dashboard loads the regional fleet and shows a believable cooling fault while the other vehicles continue following their routes.

## 3. Rank workshops by earliest feasible repair completion

- [x] Limit eligibility to the scenario's synthetic truck class, configured repair capabilities, and transport limits. Include travel, parts readiness, technician availability, bay availability, and repair duration for each eligible site.
- [x] Make the worker, API, and dashboard use the same ranking and display why the top site wins. Show an explicit unavailable state when there is no eligible site.
- [x] Verify that changing only part availability reverses the winner in the Poonamallee scenario. Use stable tie-breaking for equally ranked sites.

**Verification.** Run `pnpm --filter @kaz/orchestration test` and verify both stock variants and the no-match case through the API.

**Likely code.** `packages/orchestration/src/index.ts`, its tests, `apps/worker/src/processors/depot-match.ts`, `apps/api/src/repository-store.ts`, and the dispatch recommendation display.

**Dependencies.** Tasks 1–2.

## 4. Close the repair loop

- [x] On approved dispatch, validate availability at write time. Reserve and release bays at the corresponding workflow transitions. Duplicate requests and simultaneous attempts for the last bay keep capacity correct.
- [x] Make repair completion durable and safe to retry. Clear the repaired fault and make the simulator apply recovery before it resumes the vehicle’s route. Old queued ticks must not reopen a cleared fault.
- [x] Continue the demo after a simulator restart. Confirm unrelated faults remain intact, the repaired truck recovers, and the bay is released once.

**Verification.** Run an integration test against the demo database and Redis for dispatch, repair, restart, duplicate completion, final-bay contention, and out-of-order telemetry.

**Likely code.** `apps/api/src/repository-store.ts`, service request and depot repositories, simulator tick logic, and fault/telemetry workers as needed.

**Dependencies.** Task 3.

**Checkpoint.** The full demo works with the deterministic planner and no AI credentials.

## 5. Add AI explanations and run the demo

- [x] Supply ranked candidates and their supporting data to the existing LangChain planner. Validate its proposal against eligibility and availability. Fall back on the deterministic result if the AI is unavailable or fails validation.
- [x] Show the recommendation and its reasons in Dispatch. Require manager approval regardless of how the recommendation was produced.
- [x] Document startup and the repeatable walkthrough. Verify the [demo matrix](plan.md#demo-and-release-criteria) through the API and controlled tests.

**Verification.** Test invalid AI output and fallback with a stub. Run `pnpm test`, `pnpm typecheck`, and `pnpm build`. Walk through Depots, Triage, Dispatch, and Workflow locally. If AI credentials are configured, run `pnpm test:ai-live` as a separate check.

**Likely code.** `packages/ai/src/dispatch-reasoning.ts`, dispatch tools and schemas, `apps/api/src/repository-store.ts`, and the dispatch UI.

**Dependencies.** Tasks 3–4.

**Checkpoint.** A fresh demo can reproduce the two stock outcomes, the no-match state, and a repaired truck that stays repaired.
