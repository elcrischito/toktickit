# Post-submission fixes (Labs 1–4)

**Date:** 14 Nov 2026 · **Branch:** `fix/labs-1-4-cleanup`

After handing in the Lab 4 PDF I went back over the whole repo (Labs 1 to 4) and found some problems that were not visible in the PDFs. The submitted PDFs were **not changed**. This file lists what was wrong and what I fixed, so the history stays clear.

## What was wrong

| # | Problem | Why it happened |
|---|---------|-----------------|
| 1 | `docs/lab-02/` on `main` only had `specification.md` | `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md` and `ai-use.md` were written on their own branches (`lab2-api-spec`, `lab2-ui-spec`, `lab2-tests-plan`, `lab2-reviewer-and-ai-use`) and never merged |
| 2 | Attachments (Lab 2, BR-13 to BR-18) no longer worked | The attachment routes stayed in `server/src/app.ts`. In Lab 3 the server switched to `lab3App.ts`, so these routes were not mounted anymore |
| 3 | My Tickets lost pagination (BR-20), the category filter and the error/empty states (BR-22, AC-11) | The Lab 3 rewrite of the Requester pages only kept search and status |
| 4 | Create Ticket had no field-level messages (AC-04) and no success screen with the Ticket Number (AC-01) | Same Lab 3 rewrite |
| 5 | `cd server && npm run build` failed with 42 TypeScript errors | The old `src/app.ts` was still compiled but no longer matched the Lab 3 Prisma schema |
| 6 | Lab 1/2 tests failed (15 UI tests, 2 API test files could not load), and 2 Lab 3 API tests needed a dev server on port 5000 | The tests still used the Development Requester selector / `x-requester-id`, which was replaced by login in Lab 3 (BR-24) |
| 7 | Vitest was also running the Playwright specs | No `include` in the Vitest config |
| 8 | Optimistic locking (BR-08) compared the version and saved in two separate queries | Two saves at the same moment could both win |
| 9 | `server/.env.example` had `PORT=3000` but the README and Vite proxy use 5000; no `JWT_SECRET` in it | Not updated after Lab 3 |
| 10 | Lab 4 docs did not match the code: `tests.md` still said "Planned" with wrong E2E paths, `confirm-resolved` instead of `problem-resolved`, DoD pointed to an `artifacts/` folder that doesn't exist | Docs were written before the implementation and not updated after |
| 11 | Login screen said "TikTockIT" | Typo |

## What I changed

- **Docs:** merged the five missing Lab 2 documents unchanged from their branches. Updated `docs/lab-04/tests.md`, `api-spec.md` and `specification.md` so they match the code and the real test results. Updated the README.
- **Attachments:** new `server/src/routes/attachments.ts` using the JWT login (owner Requester can upload/remove, IT Staff and Admin can view/download), and a new `AttachmentsSection` on Ticket Detail. Files can also be attached when creating a ticket.
- **My Tickets / Create Ticket:** brought back the Lab 2 behaviour listed above.
- **Concurrency:** the save is now filtered on the expected `version`, so a stale save gets `409 Conflict`.
- **Tests:** moved the Lab 1/2 tests to the current app and login. Removed the Development Requester selection test, because that screen was removed on purpose in Lab 3. Added tests for attachments.
- **Cleanup:** deleted the unused Lab 2 code (`server/src/app.ts`, `server/src/prisma.ts`, and the old client pages and `api.ts` that nothing imported).

## Test results

| Suite | Before (main) | After |
|-------|---------------|-------|
| Backend `npm test` | 22 passed, 3 failed, 2 files could not load | **53 / 53** |
| Frontend `npx vitest run` | 10 passed, 15 failed | **26 / 26** |
| Backend `npm run build` | 42 errors | **0 errors** |
| Playwright (Desktop, Tablet, Mobile) | Lab 2 journey broken | **15 / 15** |

Screenshots of the fixed screens are in `docs/evidence/post-submission/`.

## Not changed

- The PDFs submitted for Labs 1–4.
- `docs/lab-03/reviewer.md` and `docs/lab-04/reviewer.md`. These labs were not reviewed through PRs. Simeon is reviewing this fix PR instead.
