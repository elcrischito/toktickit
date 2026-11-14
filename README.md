# TokTickIT

TokTickIT is an IT service desk application for **Account and Access**, **Hardware**, **Software**, and **Network** requests.

This repository contains the full-stack implementation through **Lab 3**:
- **Frontend**: React + TypeScript + Vite + Bootstrap (Zen Green design system)
- **Backend**: Node.js + Express + TypeScript (REST API + JWT authentication & RBAC)
- **Database**: PostgreSQL + Prisma ORM
- **Testing**: Vitest + Supertest + Playwright

## Roles & Features (Lab 3)
- **Authentication**: Email/password login (`POST /api/auth/login`), bcrypt password hashing, JWT bearer tokens, mandatory initial password change (`POST /api/auth/change-password`), and session inspection (`GET /api/auth/me`).
- **Requester (`REQUESTER`)**: Create tickets with attachments, view/filter/sort own tickets, add public comments, and mark issues as resolved.
- **IT Staff (`IT_STAFF`)**: Access the global IT Staff ticket queue (`GET /api/staff/tickets`), update status/IT priority/owner (`PATCH /api/staff/tickets/:id`), and post append-only **Internal Notes** hidden from requesters.
- **Administrator (`ADMIN`)**: Full IT Staff capabilities plus user lifecycle management (`GET/POST/PATCH /api/admin/users` and password resets), enforcing safety rules against self-deactivation or removing the last active admin.

## Project Structure
- `client/` — React + Vite frontend
- `server/` — Express backend, Prisma schema/migrations/seed, API tests
- `docs/lab-01/`, `docs/lab-02/`, `docs/lab-03/` — Engineering specs, API/UI contracts, test plans, reviewer & AI logs

## Setup & Run Locally

### 1. Database (PostgreSQL)
Start the PostgreSQL container (if using Docker) or ensure PostgreSQL is running on `localhost:5432`:
`docker start toktickit-db`

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
`cd server && npm test`
`cd client && npm test`
