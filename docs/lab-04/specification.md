# Sprint 4 Engineering Specification — TokTickIT (Lab 4)

## 1. Sprint Goal
Complete the core TokTickIT IT service-desk lifecycle by introducing parent-child **Actions Taken** tracking under Tickets, enforcing the complete Ticket status-transition matrix with optimistic concurrency control, delivering role-appropriate operational dashboards (`IT Staff`, `Requester`, `Admin`), and hardening all Labs 1–4 workflows under the Zen Green design language.

## 2. Stakeholder Request
IT Staff and Administrators need a structured, auditable log of **Actions Taken** under each Ticket (capturing date/time, action description, outcome/result, automatic performer attribution, optional active assignee, follow-up flag with mandatory follow-up note, and attachment reference notes) while keeping a single primary Ticket Owner accountable for coordination. Requesters can view Actions Taken on their own Tickets and indicate when an issue appears resolved, while IT Staff retain exclusive authority to formally transition Tickets to `Resolved` or `Closed`. Requesters and IT Staff/Administrators also receive concise dashboards linked to detailed views, alongside full regression hardening.

## 3. Scope
- **Included:** Actions Taken CRUD & status transitions (`PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), complete Ticket status matrix with optimistic concurrency (`409 Conflict`), Requester & IT Staff/Admin dashboards with drill-downs, non-destructive Prisma migration + idempotent seed, and full Labs 1–4 regression & accessibility hardening.
- **Excluded:** Automatic SLA clocks/escalations, external notifications (email/SMS/LINE/push), spare-parts inventory/cost accounting, timesheet billing, multi-level approvals, custom BI builders, and multi-tenancy.

## 4. Functional Requirements
- **FR-01 (Create Action Taken):** Authenticated `IT_STAFF` and `ADMIN` users can create an Action Taken under any Ticket with `actionDateTime`, `description`, `result`, `status`, optional active `assignedToId`, `followUpRequired`, conditional `followUpNote`, and `attachmentNotes`. Backend auto-sets `performedById` from JWT.
- **FR-02 (Update & Transition Action Taken):** Authenticated `IT_STAFF` and `ADMIN` users can update an existing Action Taken (description, result, assignee, status, follow-up fields, attachment notes) with optimistic version validation.
- **FR-03 (Role-Scoped Action Taken Visibility):** Requesters can view all Actions Taken on Tickets where `ticket.requesterId === user.id`, sorted by `actionDateTime ASC, id ASC`, and receive `403 Forbidden` on write attempts or unowned Tickets.
- **FR-04 (Complete Ticket Status Matrix):** Backend enforces permitted Ticket transitions across all 8 statuses and rejects illegal transitions with `400 Bad Request`.
- **FR-05 (Advisory Resolution Gate):** A Requester clicking *Problem Appears Resolved* records an advisory comment without changing `ticket.status` to `RESOLVED`. Only `IT_STAFF` or `ADMIN` may transition a Ticket to `RESOLVED` (requiring `resolutionSummary`).
- **FR-06 (IT Staff & Admin Dashboard):** `GET /api/dashboard/staff` returns authoritative counts (`newCount`, `openCount`, `inProgressCount`, `waitingForRequesterCount`, `unassignedCount`, `myAssignedCount`, `highPriorityOpenCount`, `myActionsCount`), optional `userSummary` for `ADMIN`, top 5 `recentTickets`, and top 5 `myRecentActions` with drill-down filters.
- **FR-07 (Requester Dashboard):** `GET /api/dashboard/requester` returns metrics strictly scoped to `requesterId === user.id` (`myOpenCount`, `inProgressCount`, `waitingForMeCount`, `resolvedCount`, `closedCount`), `attentionTickets`, and `recentTickets`.
- **FR-08 (Regression & Hardening):** All Labs 1–3 features continue working with safe failure handling, double-submit protection, and WCAG/responsive compliance.

## 5. Business Rules
- **BR-01 (Parent Ownership):** Every `ActionTaken` belongs to exactly one `Ticket` (`ticketId` FK with cascade delete).
- **BR-02 (Performer vs. Ticket Owner):** A Ticket has at most one coordinating `ownerId`, while any active `IT_STAFF` or `ADMIN` may perform and record `ActionTaken` entries; `performedById` is immutable after creation.
- **BR-03 (Active Staff Assignee Validation):** If `assignedToId` is provided on an `ActionTaken`, the target user must exist, have `isActive === true`, and hold role `IT_STAFF` or `ADMIN` (`400 Bad Request` otherwise).
- **BR-04 (Conditional Follow-Up Note):** Whenever `followUpRequired === true`, `followUpNote` must be a non-empty trimmed string (`400 Bad Request` if blank).
- **BR-05 (Audit History & Stable Ordering):** Actions Taken use `status = CANCELLED` instead of deletion and sort deterministically by `actionDateTime ASC, id ASC`.
- **BR-06 (Ticket Transition Matrix):**
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `CANCELLED` (`IT_STAFF`, `ADMIN`)
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` (`IT_STAFF`, `ADMIN`)
  - `IN_PROGRESS` -> `OPEN`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` (`IT_STAFF`, `ADMIN`)
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED` (`IT_STAFF`, `ADMIN`)
  - `RESOLVED` -> `CLOSED` (`IT_STAFF`, `ADMIN`), `REOPENED` (`REQUESTER` owner, `IT_STAFF`, `ADMIN`)
  - `REOPENED` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` (`IT_STAFF`, `ADMIN`)
  - `CLOSED` -> `REOPENED` (`IT_STAFF`, `ADMIN`)
  - `CANCELLED` -> *(terminal state)*
- **BR-07 (Resolution Authority Gate):** `REQUESTER` cannot transition a Ticket to `RESOLVED` or `CLOSED` (`403 Forbidden`). Transitioning to `RESOLVED` requires a non-empty `resolutionSummary`.
- **BR-08 (Optimistic Concurrency Guard):** Updating a `Ticket` or `ActionTaken` with a stale `version` returns `409 Conflict`.
- **BR-09 (Authoritative Dashboard Scopes):** Requester metrics filter strictly by `requesterId = req.user.id`; Staff metrics aggregate live PostgreSQL state and return `0` / empty arrays when empty.

## 6. UI Specification Summary
Extends Zen Green (`#1b4332` primary, `#52b788` accent, `#f8f9fa` background, `#ffffff` cards) with `/dashboard` landing view for all roles, drill-down cards, chronological `Actions Taken` section on `TicketDetail` (Create/Edit for Staff/Admin, read-only for Requester), and constrained status transitions (`docs/lab-04/ui-spec.md`).

## 7. Data Changes
- **New Enum `ActionStatus`:** `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
- **New Model `ActionTaken`:** `id`, `ticketId`, `actionDateTime`, `description`, `result`, `status`, `performedById`, `assignedToId`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `version`, `createdAt`, `updatedAt`. Indexed on `(ticketId, actionDateTime)` and `(assignedToId, status)`.
- **Ticket Model Evolution:** Add `version Int @default(1)` and `actionsTaken ActionTaken[]`.
- **Justified Design Decisions:** (1) Dedicated `ActionTaken` table separates structured work logs visible to Requesters from private `InternalNote` entries; (2) Integer `version` field enables stateless optimistic concurrency (`409 Conflict`) without database row locks.
- **Migration & Backfill:** Non-destructive Prisma migration (`add_lab4_actions_taken_and_version`); legacy Tickets default to `version = 1` and `0` Actions Taken; rollback drops `ActionTaken` and `Ticket.version`.

## 8. API Contract
Defined in `docs/lab-04/api-spec.md`: `GET/POST /api/tickets/:id/actions`, `PATCH /api/tickets/:id/actions/:actionId`, `PATCH /api/staff/tickets/:id`, `POST /api/tickets/:id/problem-resolved`, `POST /api/tickets/:id/reopen`, `GET /api/dashboard/staff`, `GET /api/dashboard/requester`.

## 9. Acceptance Criteria
- **AC-01:** Permitted `IT_STAFF`/`ADMIN` creates valid Action Taken with auto `performedById` and valid active assignee (`201 Created`).
- **AC-02:** `followUpRequired = true` with empty `followUpNote` returns `400 Bad Request` and preserves form input.
- **AC-03:** Inactive user or `REQUESTER` as `assignedToId` returns `400 Bad Request`.
- **AC-04:** Editing/completing/cancelling an Action Taken updates state (`200`), while stale `version` returns `409 Conflict`.
- **AC-05:** Requester sees all Actions Taken on owned Ticket in read-only mode; `POST`/`PATCH` returns `403 Forbidden`.
- **AC-06:** Illegal Ticket transitions or Requester `RESOLVED` attempts return `400`/`403`; stale `version` returns `409 Conflict`.
- **AC-07:** `GET /api/dashboard/requester` returns only owned metrics/Tickets and drills down to `/my-tickets`.
- **AC-08:** `GET /api/dashboard/staff` returns live DB counts, current-user actions, and drills down to `/queue`.
- **AC-09:** All Labs 1–3 regression suites pass with zero console errors or horizontal overflow across Desktop, Tablet, and Mobile.

## 10. Definition of Done
- [ ] All Sprint 4 GitHub Issues in `Done` on Kanban board.
- [ ] Feature branches merged into `lab4-staging` and then `main` via reviewed PRs. *(Lab 4 branches were merged locally without a PR review; peer review is being done on the post-submission fix PR.)*
- [x] `docs/lab-04/*` committed before implementation PR completion.
- [x] Prisma migration & idempotent seed verified without data loss.
- [x] All Lab 4 API, UI, E2E tests and Labs 1–3 regression tests pass (Labs 1–3 suites fixed after submission, see `docs/post-submission-fixes.md`).
- [x] Screenshots saved in `docs/evidence/lab-04/` and final PDF (`docs/lab-04/TokTickIT-Lab4-Submission.pdf`) compiled.

## 11. Assumptions and Decisions
- Authenticated users land on `/dashboard` by default after login (once `mustChangePassword` is false), with top-nav links to `/my-tickets`, `/queue`, `/create-ticket`, and `/admin/users`.
