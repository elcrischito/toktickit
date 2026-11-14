# Sprint 3 Test Plan & Execution Evidence — TokTickIT

## 1. Test Pyramid & Strategy
- **API & Integration Tests (`server/tests/lab-03/`)**: Executed via Vitest + Supertest against PostgreSQL/Prisma (`auth.api.test.ts` and `lab3.api.test.ts` — 12 automated test cases).
- **UI & Role-Based Component Tests (`client/tests/lab-03/Lab3UI.test.tsx`)**: Executed via Vitest + React Testing Library + JSDOM (5 automated UI security & workflow test cases).
- **End-to-End & Responsive Verification (`docs/lab-03/screenshots/`)**: Playwright headless verification across Desktop (`1280x800`), Tablet (`768x1024`), and Mobile (`390x844`) viewports.

## 2. Requirements & Business Rules Traceability Matrix
| Test ID | Requirement / Rule | Scenario Verified | Status |
| :--- | :--- | :--- | :--- |
| AUTH-01 | FR-01 / BR-01 | Rejects login with invalid credentials (`401 Unauthorized`) | PASS |
| AUTH-02 | FR-01 / BR-01 | Rejects login for deactivated user accounts (`401 Unauthorized`) | PASS |
| AUTH-03 | FR-01 / AC-01 | Authenticates active user and returns JWT + role metadata (`200 OK`) | PASS |
| AUTH-04 | FR-01 | Session inspection via `GET /api/auth/me` and unauthenticated rejection (`401`) | PASS |
| ADMIN-01 | FR-07 | Blocks non-admin roles from `/api/admin/users` (`403 Forbidden`) | PASS |
| ADMIN-02 | FR-02 / AC-02 | Creates account with `mustChangePassword=true` and enforces initial password update | PASS |
| ADMIN-03 | BR-06 / AC-05 | Prevents Administrator from deactivating their own account (`400 Bad Request`) | PASS |
| TICKET-01 | FR-03 / BR-03 | Creates ticket bound strictly to authenticated Requester ID | PASS |
| TICKET-02 | FR-06 / AC-04 | Blocks Requester from Staff Queue (`403`) and Internal Notes (`403`) | PASS |
| TICKET-03 | FR-05 / BR-05 | Staff triage update, append-only Internal Notes, and Requester resolution flag | PASS |
| UI-01..05 | UI Spec / BR-04 | Login validation, mandatory password change guard, role-specific Ticket Detail & Admin UI | PASS |
