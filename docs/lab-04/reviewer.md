# Lab 4 Code Review & Quality Checklist

## Scope Reviewed
- **Backend (`server/`)**: Prisma `ActionTaken` model & migration, `/api/dashboard/staff`, `/api/dashboard/requester`, `/api/tickets/:id/actions` (GET/POST/PATCH), `/api/tickets/:id/reopen` (POST), enforced Ticket status transition matrix, `resolutionSummary` requirement on `RESOLVED`, and optimistic concurrency checks (`409 Conflict`).
- **Frontend (`client/`)**: `StaffDashboard.tsx` (IT Staff & Admin operational metrics + filtered queue drill-down), `RequesterDashboard.tsx` (personal ticket counts + Needs Your Attention), `ActionsTakenSection.tsx` (chronological log, create/edit forms, conditional follow-up validation), `TicketDetail.tsx` (permitted status transitions, Resolution Summary input, Requester reopen action), and `Navbar.tsx` / `App.tsx` routing.
- **Automated Tests & Evidence**: Server Vitest/Supertest suites (Lab 3 & Lab 4), Client Vitest/RTL suites (Lab 3 & Lab 4), and Playwright E2E tests across Desktop (`1440x900`), Tablet (`iPad Mini`), and Mobile (`iPhone 13`).

## Verification Findings
1. **RBAC & Data Isolation**:
   - Requesters can view `Actions Taken` on their own tickets in read-only mode (`GET /api/tickets/:id/actions`) and receive `403 Forbidden` on `POST`/`PATCH` action endpoints or `/api/dashboard/staff`.
   - Internal Notes remain strictly isolated to `IT_STAFF` and `ADMIN`.
2. **State Machine & Business Rules**:
   - Invalid status jumps (e.g., `NEW -> CLOSED` or `NEW -> RESOLVED`) are blocked at both the UI selector level and API validation layer (`400 Bad Request`).
   - Marking a ticket `RESOLVED` requires a non-empty `resolutionSummary`.
   - Requesters can reopen their own `RESOLVED` tickets (`POST /api/tickets/:id/reopen`), transitioning status to `REOPENED` with an audit comment.
3. **Concurrency & Responsive Layout**:
   - Stale `version` payloads on `PATCH /api/staff/tickets/:id` and `PATCH /api/tickets/:id/actions/:actionId` return `409 Conflict` and reload fresh data in the UI.
   - All views pass Playwright E2E assertions across Desktop, Tablet, and Mobile viewports without layout overflow.
