# Sprint 4 Test Plan, Traceability Matrix & Execution Evidence — TokTickIT

| Test ID | Type | AC / Rule | What It Tests | Expected Result | Automated Test File | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API / Auth | AC-05 / FR-03 | Requester reads Actions Taken on own vs unowned Ticket | `200 OK` own; `403 Forbidden` unowned | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API / Auth | AC-05 / FR-03 | Requester attempts `POST` or `PATCH` on Actions Taken | `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AC-01 / BR-02 | Staff creates Action Taken with auto performer & active assignee | `201 Created`, `performedById === actor.id` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API / Valid | AC-02 / BR-04 | `followUpRequired=true` with blank `followUpNote` | `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | API / Valid | AC-03 / BR-03 | Assign Action Taken to inactive user or `REQUESTER` | `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | API / Concur | AC-04 / BR-08 | Update/complete/cancel Action Taken + stale `version` check | `200 OK` valid; `409 Conflict` stale | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API / Flow | AC-06 / BR-06 | Permitted vs illegal Ticket status transitions | `200 OK` valid; `400 Bad Request` illegal | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-08 | API / Flow | AC-06 / BR-07 | Requester direct `RESOLVED` vs advisory `confirm-resolved` | `403` direct; `200` advisory comment only | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-09 | API / Concur | AC-06 / BR-08 | Concurrent Ticket update with stale `version` | `409 Conflict` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| API-10 | API / Dash | AC-07 / BR-09 | Requester dashboard returns strictly owned metrics/Tickets | Matches DB counts for `requesterId` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| API-11 | API / Dash | AC-08 / BR-09 | Staff/Admin dashboard counts match DB; Requester blocked | `200 OK` exact counts; `403` Requester | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| UI-01 | UI Comp | AC-08 / FR-06 | IT Staff Dashboard cards, lists, and drill-down clicks | Renders counts & filtered queue navigation | `client/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-02 | UI Comp | AC-07 / FR-07 | Requester Dashboard cards, attention list, and drill-down | Renders personal counts & `/my-tickets` link | `client/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-03 | UI Comp | AC-01..05 | Actions Taken read-only for Requester; Create/Edit for Staff | Role isolation & follow-up validation | `client/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-04 | UI Comp | AC-06 / BR-06 | Ticket Workflow shows only permitted transitions | Illegal options hidden; conflict alert shown | `client/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| E2E-01 | E2E | AC-01..04 | Create, assign, edit & complete multiple Actions Taken | Chronological list persisted on Ticket Detail | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-05..06 | Full Ticket lifecycle through Requester check, Resolve & Close | Status rules enforced end-to-end | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-03 | E2E / Resp | AC-07..09 | Dashboards & Ticket Detail across Desktop/Tablet/Mobile | Zero horizontal overflow, working drill-downs | `e2e/lab-04/dashboards.spec.ts` | Planned |
| REG-01 | Regression | AC-09 | Full Labs 1–3 backend & frontend test suites | All 17 existing tests pass | `server/tests/lab-03/*.test.ts` | Planned |

## Execution Results & Visual Evidence
- **Backend API Tests (`cd server && npm test`)**: All Lab 3 and Lab 4 Vitest/Supertest suites passing.
- **Frontend UI Tests (`cd client && npx vitest run tests/lab-03 tests/lab-04`)**: 5 test files / 10 tests passing.
- **Playwright E2E (`cd client && npx playwright test tests-e2e/lab4-workflows.spec.ts --workers=1`)**: 12/12 tests passing across Desktop (`1440x900`), Tablet (`iPad Mini`), and Mobile (`iPhone 13`).
- **Visual Proofs (`docs/evidence/lab-04/`)**:
  - `01-staff-dashboard-desktop.png` — IT Staff Operations Dashboard metrics and recent lists
  - `02-ticket-detail-actions-taken.png` — Ticket Detail with Actions Taken creation/edit and follow-up badge
  - `03-ticket-resolved-workflow.png` — Ticket transitioned to `RESOLVED` with Resolution Summary
  - `04-requester-dashboard.png` — Requester Dashboard metrics and Needs Your Attention section
  - `05-admin-dashboard-users.png` — Administrator Dashboard user overview and RBAC navigation
  - `06-staff-dashboard-mobile.png` — Mobile responsive layout verification
