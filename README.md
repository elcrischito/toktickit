# TokTickIT

TokTickIT is an IT service desk application for **Account and Access**, **Hardware**, **Software**, and **Network** requests.

This repository contains the full-stack implementation through **Lab 4**:
- **Frontend**: React + TypeScript + Vite + Bootstrap (Zen Green design system)
- **Backend**: Node.js + Express + TypeScript (REST API + JWT authentication, RBAC, Dashboards & Actions Taken)
- **Database**: PostgreSQL + Prisma ORM
- **Testing**: Vitest + Supertest + React Testing Library + Playwright E2E

## Roles & Features (Lab 3 & Lab 4)
- **Authentication**: Email/password login (`POST /api/auth/login`), bcrypt password hashing, JWT bearer tokens, mandatory initial password change (`POST /api/auth/change-password`), and session inspection (`GET /api/auth/me`).
- **Role-Based Dashboards (`/dashboard`)**:
  - **Requester (`REQUESTER`)**: Personal ticket counts (`GET /api/dashboard/requester`), *Needs Your Attention* (`WAITING_FOR_REQUESTER` / `RESOLVED`), recent tickets, and filtered drill-down into `/my-tickets`.
  - **IT Staff (`IT_STAFF`) & Administrator (`ADMIN`)**: Operational queue metrics (`GET /api/dashboard/staff`), recent active tickets, personal *Recent Actions Taken*, and one-click filtered drill-down into `/queue` (plus active user summary for Administrators).
- **Actions Taken (`GET/POST/PATCH /api/tickets/:id/actions`)**: Chronological log of technical actions, outcomes, statuses (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), optional staff assignee, attachment notes, and conditional follow-up notes. Writable by `IT_STAFF`/`ADMIN`; read-only for ticket `REQUESTER` owners.
- **Guarded Ticket Lifecycle & Reopen**: Enforced status transition matrix (`NEW` through `CLOSED`/`CANCELLED`), mandatory `resolutionSummary` when transitioning to `RESOLVED`, optimistic concurrency control (`version` / `409 Conflict`), advisory *Problem Appears Resolved* (`POST /api/tickets/:id/problem-resolved`), and Requester *Reopen Ticket* (`POST /api/tickets/:id/reopen`).
- **User Administration (`ADMIN`)**: User lifecycle management (`GET/POST/PATCH /api/admin/users` and password resets), preventing self-deactivation or removing the last active admin.

## Project Structure
- `client/` — React + Vite frontend, Vitest UI tests (`tests/lab-03/`, `tests/lab-04/`), and Playwright E2E specs (`tests-e2e/`)
- `server/` — Express backend, Prisma schema/migrations/seed, and Vitest/Supertest API tests
- `docs/lab-01/` .. `docs/lab-04/` — Engineering specs, API/UI contracts, test plans, reviewer & AI logs
- `docs/evidence/lab-04/` — Playwright visual verification screenshots across Desktop and Mobile

## Setup & Run Locally

### 1. Database (PostgreSQL)
Ensure PostgreSQL is running on `localhost:5432` (e.g. `docker start toktickit-db`).

### 2. Backend Setup
`cd server && npm install && npx prisma migrate deploy && npx prisma db seed && npm run dev`
(API runs on `http://localhost:5000`)

### 3. Frontend Setup
`cd client && npm install && npm run dev`
(App runs on `http://localhost:5173`)

## Seeded Test Accounts
Default password for all test accounts: `Password123!`
- **Admin**: `admin@toktickit.com` (forces password change on first login)
- **IT Staff**: `michael.brown@toktickit.com`
- **Requester**: `jennifer.anderson@toktickit.com`

## Running Tests
- **Backend API (Lab 3 & Lab 4)**: `cd server && npm test`
- **Frontend UI (Lab 3 & Lab 4)**: `cd client && npx vitest run tests/lab-03 tests/lab-04`
- **Frontend Production Build**: `cd client && npm run build`
- **End-to-End (Playwright)**: `cd client && npx playwright test tests-e2e/lab4-workflows.spec.ts --workers=1`
