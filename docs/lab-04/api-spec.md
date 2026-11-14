# Sprint 4 REST API Contract — TokTickIT

All endpoints require `Authorization: Bearer <JWT>` (`401 Unauthorized` if missing/invalid).

## 1. Actions Taken Endpoints
- **`GET /api/tickets/:id/actions`:** Permitted for `IT_STAFF`, `ADMIN`, or `REQUESTER` owning the Ticket (`403` otherwise, `404` if missing). Returns `ActionTaken[]` sorted by `actionDateTime ASC, id ASC`.
- **`POST /api/tickets/:id/actions`:** `IT_STAFF` or `ADMIN` only (`403` for `REQUESTER`). Body: `{ actionDateTime?, description, result, status?, assignedToId?, followUpRequired?, followUpNote?, attachmentNotes? }`. Auto-sets `performedById = req.user.id`. Rejects blank `description`/`result`, inactive/non-staff `assignedToId`, or `followUpRequired=true` with empty `followUpNote` (`400 Bad Request`). Returns `201 Created`.
- **`PATCH /api/tickets/:id/actions/:actionId`:** `IT_STAFF` or `ADMIN` only. Updates fields/status/assignee; returns `409 Conflict` if `version` is stale. Returns `200 OK`.

## 2. Ticket Workflow & Concurrency Endpoints
- **`PATCH /api/staff/tickets/:id`:** `IT_STAFF` or `ADMIN`. Validates transition matrix (**BR-06**), requires `resolutionSummary` when setting `RESOLVED` (`400`), and returns `409 Conflict` on stale `version`.
- **`POST /api/tickets/:id/confirm-resolved`:** `REQUESTER` owner only. Appends advisory `PublicComment` without changing `ticket.status` (**BR-07**).
- **`POST /api/tickets/:id/reopen`:** `REQUESTER` owner (from `RESOLVED`) or `IT_STAFF`/`ADMIN` (from `RESOLVED`/`CLOSED`). Sets `status = REOPENED` and increments `version`.

## 3. Dashboard Endpoints
- **`GET /api/dashboard/staff`:** `IT_STAFF` or `ADMIN` (`403` for `REQUESTER`). Returns `{ metrics: { newCount, openCount, inProgressCount, waitingForRequesterCount, unassignedCount, myAssignedCount, highPriorityOpenCount, myActionsCount }, userSummary?, recentTickets, myRecentActions }`.
- **`GET /api/dashboard/requester`:** Authenticated user (`requesterId = req.user.id`). Returns `{ metrics: { myOpenCount, inProgressCount, waitingForMeCount, resolvedCount, closedCount }, attentionTickets, recentTickets }`.
