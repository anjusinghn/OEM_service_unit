# Greater Chennai fleet maintenance simulation

Build a repeatable simulation for Ashok Leyland medium and heavy trucks in Greater Chennai. Use publicly listed workshops and road corridors, then simulate the fleet, workshop capacity, staff, stock, faults, and repair times. The demo should take one truck from a developing fault through triage, workshop selection, manager-approved dispatch, repair, and return to service.

## Scope and data

- Use Poonamallee and Madhavaram as the first workshop candidates. TVS lists both with service and spares. Check the exact locations and supported truck class against Ashok Leyland’s locator and dealer listings. Add other verified workshops inside the region if they provide a meaningful alternative. Record source URLs and the date checked. [Ashok Leyland locator](https://ashokleyland.com/in/dealerlocator), [TVS workshop listings](https://www.tvs.in/ashok-leyland/).
- Start with 12 synthetic trucks on a west corridor around Poonamallee–Sriperumbudur and a north corridor around Madhavaram–Puzhal. Store coordinates and route waypoints in one versioned scenario. Label the travel estimates and operational data as simulated.
- Use simulated depot specialties, bay availability, technician shifts, inventory and replenishment, vehicle telemetry, and repair durations. The regional scenario needs no live telematics or routing integration.
- Make the regional scenario opt-in locally. Use a separate demo database and Redis instance or namespace checked before startup. Keep the existing seed and its data available.

## How it fits the code

The database seed currently generates its own vehicles and depots, and the continuous simulator builds a separate mock fleet. The simulator changes sensors cumulatively and publishes telemetry and faults through BullMQ. Depot matching caps the distance penalty, which can make a distant site score like a much closer site. The API already records service completions and writes a corrected snapshot. The simulator has no way to consume that completion, so it can publish stale readings and faults afterward.

Use one scenario definition for both the seed and simulator. Keep the current BullMQ ingestion, health worker, dashboard, and service workflow. Use a seeded random generator and controllable clock so the demo and regression tests can replay the same sequence.

Rank eligible workshops by predicted return-to-service time. For the demo, calculate estimated repair start as the latest of truck arrival, bay availability, technician availability, and parts availability. Add the estimated repair duration. Travel time comes from route waypoints and assumed speeds. When a constraint rules out a workshop, show the reason. If every workshop is ruled out, show that dispatch is blocked and leave the case for manual review.

The dispatch agent receives those same candidates and facts. Its role is to explain the tradeoffs and propose a plan. Validate its selection and required fields against the candidate list. Use the deterministic result if AI is disabled, errors, times out, or produces an infeasible plan. Recheck availability when the manager confirms dispatch.

Tie simulator recovery to the completed service request. A truck occupies one bay while it is in service. Completion releases that bay and clears the repaired fault once. On the next applicable tick, the simulator restores readings for the repaired subsystem and resumes its route. Use persisted workflow state or a durable completion record so restarts and retries do not undo the repair or release a bay twice.

## Demo and release criteria

| Scenario | Expected result |
| --- | --- |
| Truck near Poonamallee develops a cooling fault | The fault appears in triage and outranks healthy vehicles. |
| Nearby workshop lacks a part until later | A farther eligible workshop wins when it can finish sooner. The UI shows the travel and wait assumptions. |
| The same part becomes available at the nearby workshop | The recommendation flips using the same route and fault. |
| No workshop meets the repair or transport constraints | The workflow shows no eligible workshop and creates no dispatch. |
| Manager approves and completes the repair | One bay is occupied and released. The fault stays cleared and readings remain normal after a simulator restart. |
| AI is disabled or returns an unusable plan | The deterministic recommendation remains available. Approval is still required. |

The first release is ready when the full path works through the existing local dashboard and API, both stock variants are repeatable, and a long run stays within configured sensor ranges. Keep exact inventory, travel assumptions, and the expected winner in the scenario fixture so someone else can reproduce the demo. Track implementation steps in [todo.md](todo.md).

## Run the first demo

In the Chennai checkout, install the workspace dependencies with `pnpm install`, start Docker, and run `pnpm dev:chennai`. Open http://localhost:3116 to go straight to the dashboard. The local launcher connects the dashboard to the seeded Fleet Manager account automatically. The dashboard and API run on 3116 and 4116. PostgreSQL and Redis use dedicated local endpoints.

1. Open Triage and wait for `chennai-truck-01` to develop its scripted fault. It starts about 30 seconds after a fresh seed.
2. Select that truck in Dispatch and choose **Compare workshops**. The default scenario delays the cooling pump at Poonamallee, so Madhavaram should finish sooner.
3. In another terminal, run `pnpm dev:chennai --seed-only --with-part` and compare again. Poonamallee should now win. Switch back with `--seed-only --without-part`.
4. Approve a recommendation and advance it in Workflow to **In Progress**. Complete the repair and wait for the next simulator tick. Check the cleared fault and restored coolant temperature. Close the request when done.
5. To replay the fault from the start, stop the demo and run `pnpm dev:chennai --reset`. This clears the dedicated Chennai demo database and queues.

### Data notes

- The [TVS service directory](https://www.tvs.in/ashok-leyland/) lists both sites for service and spares. [Poonamallee's published map pin](https://maps.app.goo.gl/tu63KiYVNZd1m8FN9) is used as provided. The Madhavaram pin is an [approximate public listing](https://in.infoaboutcompanies.com/Catalog/TN/Chennai/Motor-Vehicle-Dealer/T-V-Sundram-Iyengar-_and_-Sons-Ltd._Madhavaram) for the area around the listed address. The exact workshop entrance and per-site truck model eligibility still need verification.
- Travel is estimated from the truck's position using a 1.25× road distance factor and 35 km/h. The cooling case assumes 75 minutes of repair and a 90-minute pump wait when stock is unavailable at Poonamallee. Sites with no bay or qualified technician available are excluded. The workflow advances with operator actions, so the estimates do not make the operator wait in real time.
- Rule-based dispatch works without external access. AI is optional and requires the locally configured model credentials. The API validates the proposed depot and parts, and retains the workshop estimates from the deterministic planner.
