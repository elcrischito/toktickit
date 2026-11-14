# Sprint 4 Test Plan, Traceability Matrix & Execution Evidence — TokTickIT

| Test ID | Type | AC / Rule | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API / Auth | AC-05 / FR-03 | Requester reads Actions Taken on own vs unowned Ticket | `200 OK` own; `403 Forbidden` unowned | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API / Auth | AC-05 / FR-03 | Requester attempts `POST` or `PATCH` on Actions Taken | `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-01 / BR-02 | Staff creates Action Taken with auto performer & active assignee | `201 Created`, `performedById === actor.id` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-04 | API / Valid | AC-02 / BR-04 | `followUpRequired=true` with blank `followUpNote` | `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-05 | API / Valid | AC-03 / BR-03 | Assign Action Taken to inactive user or `REQUESTER` | `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-06 | API / Concur | AC-04 / BR-08 | Update/complete/cancel Action Taken + stale `version` check | `200 OK` valid; `409 Conflict` stale | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-07 | API / Flow | AC-06 / BR-06 | Permitted vs illegal Ticket status transitions | `200 OK` valid; `400 Bad Request` illegal | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-08 | API / Flow | AC-06 / BR-07 | Requester direct `RESOLVED` vs advisory `problem-resolved` | `403` direct; `200` advisory comment only | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-09 | API / Concur | AC-06 / BR-08 | Concurrent Ticket update with stale `version` | `409 Conflict` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| API-10 | API / Dash | AC-07 / BR-09 | Requester dashboard returns strictly owned metrics/Tickets | Matches DB counts for `requesterId` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| API-11 | API / Dash | AC-08 / BR-09 | Staff/Admin dashboard counts match DB; Requester blocked | `200 OK` exact counts; `403` Requester | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| UI-01 | UI Comp | AC-08 / FR-06 | IT Staff Dashboard cards, lists, and drill-down clicks | Renders counts & filtered queue navigation | `client/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-02 | UI Comp | AC-07 / FR-07 | Requester Dashboard cards, attention list, and drill-down | Renders personal counts & `/my-tickets` link | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-03 | UI Comp | AC-01..05 | Actions Taken read-only for Requester; Create/Edit for Staff | Role isolation & follow-up validation | `client/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-04 | UI Comp | AC-06 / BR-06 | Ticket Workflow shows only permitted transitions | Illegal options hidden; conflict alert shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| E2E-01 | E2E | AC-08 / FR-06 | IT Staff Dashboard metrics and filtered queue drill-down | Dashboard cards drill into `/queue` with filter applied | `client/tests-e2e/lab4-workflows.spec.ts` | Pass |
| E2E-02 | E2E | AC-01..04, AC-06 | Actions Taken create/edit + guarded Resolve with Resolution Summary | Action persisted; illegal jumps blocked; `RESOLVED` needs summary | `client/tests-e2e/lab4-workflows.spec.ts` | Pass |
| E2E-03 | E2E | AC-05, AC-07 | Requester Dashboard, read-only Actions Taken, Reopen from `RESOLVED` | No staff controls for Requester; Reopen works | `client/tests-e2e/lab4-workflows.spec.ts` | Pass |
| E2E-04 | E2E / Resp | AC-08..09 | Admin Dashboard user summary & RBAC navigation on Desktop/Tablet/Mobile | No horizontal overflow; admin links visible | `client/tests-e2e/lab4-workflows.spec.ts` | Pass |
| REG-01 | Regression | AC-09 | Full Labs 1–3 backend & frontend suites (migrated to the Lab 3 login, see `docs/post-submission-fixes.md`) | All pass | `server/tests/lab-0{1,2,3}/`, `client/tests/lab-0{1,2,3}/`, `client/tests-e2e/requester-journey.spec.ts` | Pass |

## Execution Results & Visual Evidence
- **Backend API Tests (`cd server && npm test`)**: 10 files / 53 tests passing (Labs 1–4).
- **Frontend UI Tests (`cd client && npx vitest run`)**: 9 files / 26 tests passing (Labs 1–4).
- **Playwright E2E (`cd client && npx playwright test --workers=1`)**: 5 scenarios × 3 viewports = 15/15 passing across Desktop (`1440x900`), Tablet (`iPad Mini`), and Mobile (`iPhone 13`).
- Re-run on 2026-11-14 after the post-submission fixes; the original Lab 4 submission only ran the Lab 3 and Lab 4 suites, and the Lab 1/2 suites were failing at that time (see `docs/post-submission-fixes.md`).
- **Visual Proofs (`docs/evidence/lab-04/`)**:
  - `01-staff-dashboard-desktop.png` — IT Staff Operations Dashboard metrics and recent lists
  - `02-ticket-detail-actions-taken.png` — Ticket Detail with Actions Taken creation/edit and follow-up badge
  - `03-ticket-resolved-workflow.png` — Ticket transitioned to `RESOLVED` with Resolution Summary
  - `04-requester-dashboard.png` — Requester Dashboard metrics and Needs Your Attention section
  - `05-admin-dashboard-users.png` — Administrator Dashboard user overview and RBAC navigation
  - `06-staff-dashboard-mobile.png` — Mobile responsive layout verification
