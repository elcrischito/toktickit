# Lab 2 Reviewer Log

Peer reviewer for Lab 2: **Simeon** (GitHub: [simeon-94](https://github.com/simeon-94))
Reviewer for Simeon's Lab 2 repository: **Mams / elcrischito**

This log records the peer review activity for Sprint 2 (TokTickIT), on both my own repository
(elcrischito/toktickit) and Simeon's repository (simeon-94/toktickit), as required by the Lab 2
Definition of Done.

## 1. Pull Requests on elcrischito/toktickit (my repository)

| # | Title | Base | Status | Reviewer |
|---|---|---|---|---|
| [#15](https://github.com/elcrischito/toktickit/pull/15) | docs: Lab 2 engineering specification | lab2-staging | Merged | simeon-94 |
| [#16](https://github.com/elcrischito/toktickit/pull/16) | docs: add Lab 2 API contract specification | lab2-staging | Open | simeon-94 |
| [#17](https://github.com/elcrischito/toktickit/pull/17) | docs: Lab 2 UI specification | lab2-staging | Open | simeon-94 |
| [#18](https://github.com/elcrischito/toktickit/pull/18) | docs: add Lab 2 test plan | lab2-staging | Open | simeon-94 |
| [#27](https://github.com/elcrischito/toktickit/pull/27) | feat: Development Requester context (Issue 5) | lab2-staging | Open | simeon-94 |
| [#28](https://github.com/elcrischito/toktickit/pull/28) | feat: Reference data - Related System + Category isActive (Issue 7) | lab2-staging | Open | simeon-94 |
| [#29](https://github.com/elcrischito/toktickit/pull/29) | feat: add Ticket creation with validation (Issue 8) | lab2-staging | Closed (not merged — Approved by Simeon, but superseded by #30, which already included the same code due to branch duplication needed to keep working while earlier PRs were pending) | simeon-94 |
| [#30](https://github.com/elcrischito/toktickit/pull/30) | feat(my-tickets): implement My Tickets list with search, filter, sort, pagination | lab2-staging | Merged (Approved) | simeon-94 |
| [#31](https://github.com/elcrischito/toktickit/pull/31) | feat: My Tickets list + Ticket Detail/Attachments (Issues 9 & 6) | lab2-staging | Merged | simeon-94 |
| [#32](https://github.com/elcrischito/toktickit/pull/32) | test(e2e): E2E and responsive screenshot capture (Issue 7) | lab2-staging | Open | simeon-94 |

## 2. Comments Received from Simeon (selected examples)

**PR #15 — specification.md:**
> "LGTM! The spec is super clean, comprehensive, and well-structured. The token breakdown, state
> handling (load, empty, error), and mobile/desktop responsive design rules look spot on."

**PR #29 — Create Ticket:**
> "Are these types (Ticket, ValidationErrorBody) manually kept in sync with the server's Prisma
> schema and validation responses, or generated/shared somehow? Just curious how you're avoiding
> drift between client and server here."

**PR #30 — My Tickets:**
> "Since this PR adds pagination and sorting to the ticket list, is there a typed response
> wrapper somewhere (e.g. `{ items: Ticket[], page, totalPages }`), or does the endpoint just
> return a raw `Ticket[]`? Might be worth typing that too if the frontend needs page/pageCount
> info."

> "Interesting choice to pass `requesterId` as a header rather than a query param or body field —
> is it validated against the DevRequester table server-side before creating the ticket, or just
> trusted as-is from the header?"

**PR #31 — My Tickets + Ticket Detail/Attachments:**
> "Nice touch making `itPriority` nullable separately from `requestedPriority` — makes sense
> since IT hasn't triaged it yet."

## 3. My Responses / Follow-up

Simeon's questions on request validation (`requesterId` header trust, pagination response
typing) directly informed the API contract documented in `api-spec.md` — the header is validated
against the `DevRequester` table server-side on every request (see BR-04 and the `POST
/api/tickets` implementation), and the paginated response does use a typed wrapper (`{ data,
meta: { page, pageSize, totalItems, totalPages } }`) as specified in Section 6.1 of
`api-spec.md`.

## 4. Reciprocal Reviews on Simeon's Repository (simeon-94/toktickit)

As required, I also reviewed and commented on Simeon's own Lab 2 pull requests:

**[simeon-94/toktickit#16](https://github.com/simeon-94/toktickit/pull/16) — "Add create ticket
form with attachment upload":**
> "Good test coverage for CreateTicket — nice touch mocking the requester via localStorage
> through RequesterProvider. Looks solid."

**[simeon-94/toktickit#20](https://github.com/simeon-94/toktickit/pull/20) — "Add Ticket Detail
screen with attachment management":**
> "Nice addition — making MyTickets rows clickable via `onOpenTicket` is a clean way to wire up
> navigation to TicketDetail. The attachment soft-remove test (attachment-removed-badge +
> disabled download button) covers a good edge case. One question: is `MAX_FILE_SIZE` (5MB) and
> the 5-attachment cap also enforced server-side, or only in the frontend
> `handleFileChange`? Might be worth double-checking that a direct API call couldn't bypass those
> limits."

Simeon's reply: "thank you for the comment" (acknowledged, no further changes requested in this
review cycle).

## 5. Approvals Summary

- PR #15 — Approved and merged by Simeon
- PR #29 — Approved by Simeon (later closed without merge as its content was already included
  in PR #30)
- PR #30 — Approved and merged by Simeon
- PR #31 — Merged by Simeon
- PR #16, #17, #18, #27, #28, #32 — under review, pending final approval/merge before the Lab 2
  release PR (`lab2-staging` → `main`)

## 6. Note on Branch/PR History

Because several feature branches were created in parallel before earlier PRs were merged into
`lab2-staging`, some code (Development Requester context, Reference data, Ticket creation) had to
be temporarily duplicated across branches so work could continue without being blocked. This
led to PR #29 becoming redundant once PR #30 was merged (it contained the same Ticket-creation
code). PR #29 was closed without merging once this was identified, and no work was lost — all of
its functional content is present in the merged PR #30. This is documented here for traceability
and reflected on further in `ai-use.md`.