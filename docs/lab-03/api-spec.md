# Sprint 3 REST API Specification — TokTickIT

## Authentication & Session Endpoints
- **POST /api/auth/login**
  - Payload: `{ email, password }`
  - Response: `{ user: { id, fullName, email, role, mustChangePassword }, token }`
- **POST /api/auth/logout**
  - Clears session cookie/token.
- **GET /api/auth/me**
  - Returns authenticated user payload or 401.
- **POST /api/auth/change-password**
  - Payload: `{ currentPassword, newPassword }`
  - Response: `{ message: "Password updated successfully" }`

## IT Staff Ticket Queue & Operations
- **GET /api/staff/tickets**
  - Query params: `search`, `status`, `priority`, `page`, `limit`
  - Response: `{ tickets: [...], total, page, totalPages }`
- **PATCH /api/staff/tickets/:id**
  - Payload: `{ ownerId, itPriority, status }`
  - Response: Updated ticket object.

## Comments & Notes Endpoints
- **GET /api/tickets/:id/comments** — Returns list of public comments.
- **POST /api/tickets/:id/comments** — Payload: `{ content }`.
- **GET /api/tickets/:id/notes** — Restricted to IT_STAFF and ADMIN. Returns internal notes.
- **POST /api/tickets/:id/notes** — Payload: `{ content }`. Restricted to IT_STAFF and ADMIN.

## Administrator User Management Endpoints
- **GET /api/admin/users** — Query params: `search`, `role`.
- **POST /api/admin/users** — Payload: `{ fullName, email, role, isActive, initialPassword }`.
- **PATCH /api/admin/users/:id** — Payload: `{ fullName, email, role, isActive }`.
- **POST /api/admin/users/:id/reset-password** — Payload: `{ newInitialPassword }`.
