# Lab 2 Test Plan and Results

## 1. Test Strategy

Testing follows Test-Driven Development: for each Issue, the planned tests below are written first
(and confirmed failing for the right reason) before the corresponding feature code is implemented.
Coverage spans six levels — unit, API/integration, UI component, UI style, responsive/visual, and
end-to-end — so that every Acceptance Criterion in `specification.md` has at least one automated test
proving it, rather than relying on manual spot-checks or an AI agent's claim that a feature "works."

Test commands (final, once implemented):
- Backend unit/API: `npm run test --workspace=server`
- Frontend unit/UI: `npm run test --workspace=client`
- E2E: `npm run test:e2e`

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator produces unique `TKT-YYYY-NNNNNN` format | Generated number matches pattern and is unique across calls | `server/tests/lab-02/ticket-number.unit.test.ts` | Pending |
| UNIT-02 | Unit | BR-07 | Summary trimming/length validator | Rejects <5 or >120 chars after trim; accepts boundary values | `server/tests/lab-02/validators.unit.test.ts` | Pending |
| UNIT-03 | Unit | BR-08 | Description trimming/length validator | Rejects <10 or >2000 chars after trim; accepts boundary values | `server/tests/lab-02/validators.unit.test.ts` | Pending |
| UNIT-04 | Unit | BR-13 | Attachment MIME/type allow-list check | Accepts JPG/JPEG/PNG/WEBP/PDF; rejects others | `server/tests/lab-02/attachment-rules.unit.test.ts` | Pending |
| UNIT-05 | Unit | BR-14 | Attachment size check | Accepts ≤5MB; rejects >5MB | `server/tests/lab-02/attachment-rules.unit.test.ts` | Pending |
| API-01 | API | AC-01, FR-03, FR-04 | POST /api/tickets with valid data | 201; Ticket persisted; response includes generated `ticketNumber` | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-02 | API | AC-04, BR-07 | POST /api/tickets with empty Summary | 400; `error.fields.summary` present; no Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | BR-08 | POST /api/tickets with Description too short | 400; field-level message; no Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-04 | API | BR-09 | POST /api/tickets with invalid categoryId | 400 `INVALID_REFERENCE`; no Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-05 | API | BR-04 | POST /api/tickets with inactive requesterId | 400 `INVALID_REQUESTER`; no Ticket created | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-06 | API | AC-16, BR-19 | Ticket created, one attached file fails to upload | Ticket still saved (201 on ticket creation); failed file reported separately | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-07 | API | AC-03, FR-10 | GET /api/tickets/:id for a Ticket owned by another Requester | 404 (identical shape to a non-existent Ticket) | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-08 | API | AC-10, BR-20 | GET /api/tickets with 12 seeded Tickets, default pagination | 10 items on page 1; `meta.totalPages = 2` | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-09 | API | AC-11 | GET /api/tickets?search=zzz-no-match | `data: []`, `meta.totalItems: 0`, distinguishable from empty-account case | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-10 | API | AC-12 | GET /api/tickets switching `x-requester-id` from A to B | Response contains only Requester B's Tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-11 | API | BR-20 | GET /api/tickets with invalid `page`/`pageSize` | Falls back to defaults (page 1, size 10) rather than erroring | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-12 | API | AC-06, BR-14 | POST attachment >5MB | 400 `FILE_TOO_LARGE`; not stored | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-13 | API | AC-07, BR-15 | POST 6th active attachment on a Ticket with 5 active | 400 `ATTACHMENT_LIMIT_REACHED` | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-14 | API | AC-08, BR-16, BR-17 | DELETE attachment with valid reason | 200; `isRemoved: true`; metadata retained | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-15 | API | BR-17 | DELETE attachment with missing removal reason | 400 validation error; attachment remains active | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-16 | API | AC-09 | GET download for a removed attachment | 403 `ATTACHMENT_REMOVED` | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-17 | API | BR-18, FR-10 | DELETE attachment belonging to another Requester's Ticket | 404 (ownership not revealed) | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-18 | API | — (conflict case) | DELETE an already-removed attachment | 409 `ALREADY_REMOVED` | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| UI-01 | UI | AC-04 | CreateTicket form submit with empty Summary | Field-level message rendered; `fetch`/API not called | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-02 | UI | BR-11 | Submit button during in-flight request | Button shows busy state and is disabled | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-03 | UI | BR-12 | Simulated API failure on submit | Entered field values remain populated after error | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-04 | UI | AC-15, BR-04 | Requester Selection dropdown render | Inactive seeded Requester does not appear in options | `client/src/.../RequesterSelection.test.tsx` | Pending |
| UI-05 | UI | AC-02 | Navigating to My Tickets with no Requester selected | Redirects to/renders Requester Selection screen | `client/src/.../AppShell.test.tsx` | Pending |
| UI-06 | UI | AC-11 | MyTickets rendered with zero search results | No-results state shown (distinct copy from empty-account state) | `client/src/.../MyTickets.test.tsx` | Pending |
| UI-07 | UI | AC-12, BR-23 | Change Requester triggers reload | My Tickets list clears and refetches for new Requester | `client/src/.../AppShell.test.tsx` | Pending |
| UI-08 | UI Style | Section 3–5 of `ui-spec.md` | Field/badge CSS class + color assertions | Required classes/tokens present on rendered elements | `client/src/.../ui-style.test.tsx` | Pending |
| RESP-01 | Responsive | AC-05, Section 7 of `ui-spec.md` | Playwright screenshot of Create Ticket success at 375px, 800px, 1280px | No clipping/overlap/horizontal scroll at any width | `e2e/lab-02/responsive-create-ticket.spec.ts` | Pending |
| RESP-02 | Responsive | Section 7 of `ui-spec.md` | Playwright screenshot of My Tickets table→card transition | Table renders desktop/tablet; cards render mobile; no clipping | `e2e/lab-02/responsive-my-tickets.spec.ts` | Pending |
| E2E-01 | E2E | AC-01, AC-05 | Full flow: select Requester → create Ticket → see confirmation | Confirmation shows official Ticket Number end to end | `e2e/lab-02/create-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-01, FR-05 | Create a Ticket, then find it in My Tickets by searching its number | Ticket appears in the filtered list and opens correctly | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-03 | E2E | AC-03, AC-12 | Create Ticket as Requester A, switch to Requester B, attempt to open A's Ticket URL directly | Ticket Detail shows not-found state, no data leaked | `e2e/lab-02/ownership-boundary.spec.ts` | Pending |
| E2E-04 | E2E | AC-08, AC-09 | Add an attachment, remove it with a reason, attempt to download it | Removed attachment blocked from download in the same session | `e2e/lab-02/attachment-lifecycle.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | UI-05 |
| AC-03 | API-07, E2E-03 |
| AC-04 | API-02, UI-01 |
| AC-05 | E2E-01, RESP-01 |
| AC-06 | API-12 |
| AC-07 | API-13 |
| AC-08 | API-14, E2E-04 |
| AC-09 | API-16, E2E-04 |
| AC-10 | API-08 |
| AC-11 | API-09, UI-06 |
| AC-12 | API-10, UI-07, E2E-03 |
| AC-13 | (see Section 7, Known Limitations — manual + error-state UI tests) |
| AC-14 | UI-02 |
| AC-15 | UI-04 |
| AC-16 | API-06 |

Every Acceptance Criterion maps to at least one planned automated test; several (AC-01, AC-03, AC-05,
AC-08, AC-09, AC-12) are covered at multiple levels (API + E2E, or API + UI) for defense in depth on
the rules considered highest-risk (ownership boundary, attachment soft-removal).

## 4. Responsive and Visual Checklist

Applied per screen (Create Ticket, My Tickets, Ticket Detail) at 375px (mobile), 800px (tablet), and
1280px (desktop), per `ui-spec.md` Section 9:
- [ ] No clipped labels or truncated buttons
- [ ] No overlapping validation messages
- [ ] No unintended horizontal scrolling
- [ ] Badge colors/text match the UI spec exactly
- [ ] Read-only vs. editable fields are visually distinguishable
- [ ] Screenshots stored under `artifacts/lab-02/screenshots/<screen>/<viewport>.png`

## 5. Test Commands

```
# Backend (unit + API)
npm run test --workspace=server

# Frontend (unit + UI component + UI style)
npm run test --workspace=client

# End-to-end + responsive/visual (Playwright)
npm run test:e2e
```

All three must be run against the final `main` branch before submission, with passing output captured
as evidence for Part 3 of the PDF.

## 6. Final Results

To be completed once implementation is done: paste final terminal output (pass/fail counts) for each
of the three commands above, and update the "Final" column in Section 2 from `Pending` to `Pass` (or
`Fail`/`Skipped` with justification — no test may remain silently skipped per the Definition of Done).

## 7. Known Limitations or Deferred Tests

- **AC-13** (safe error state when the backend is unreachable) is partially covered by UI-level tests
  that simulate a failed fetch; a true network-outage E2E test is not planned for Lab 2 due to
  environment complexity, and is instead verified manually with screenshots (see Part 6 evidence
  requirements in the handout: "stop the backend... show the safe error state").
- Automated accessibility auditing (e.g. axe-core) is not included in Lab 2's scope; accessibility is
  checked via the manual checklist in `ui-spec.md` Section 8 instead.
- Concurrency/race-condition testing (e.g. two simultaneous ticket-number generations) is not planned
  for Lab 2; the generator's uniqueness is verified only at the unit level (UNIT-01), not under load.