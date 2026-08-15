# Lab 1 — Peer Review

## Reviewer Details

| | |
|---|---|
| **Reviewer Name** | Simeon |
| **Student ID** | 65540460046 |
| **GitHub Username** | simeon-94 |

## Reviewed Pull Requests

### 1. Simeon reviewed my Pull Request (this repo)

**PR:** [feat: add categories endpoint, category list UI, and tests (#8)](https://github.com/elcrischito/toktickit/pull/8)

**Simeon's comment:**
> Nice, using vi.spyOn on the api module instead of mocking global fetch keeps these tests focused on the component logic. Good call replacing the todo() placeholders with real assertions for both the success and error cases.

**My response:**
> Thanks! Yeah, mocking the api module directly felt cleaner than stubbing global fetch — it keeps the tests decoupled from the actual fetch implementation.

---

**PR:** [feat: implement API health check (#6)](https://github.com/elcrischito/toktickit/pull/6)

**Simeon's comment:**
> Clean approach — separating the health check and categories fetch with clear error messages each makes the UI error states easy to handle. One small idea: you could run both fetches in parallel with Promise.all since they don't depend on each other, but this is perfectly fine as is.

**My response:**
> Good catch! You're right that Promise.all would be more efficient here since they're independent calls — I'll keep that in mind for the next iteration. For this lab I kept them sequential to make the loading/error states easier to reason about, but that's a great optimization for later.

## Reviews I Gave (Simeon's repo: simeon-94/toktickit)

I reviewed Simeon's Pull Requests for Issues #2 (API health check), #3 (create and seed categories), and #4 (display category list), leaving comments on his implementation approach (e.g. the union `Status` type for state management, the use of `upsert` for an idempotent seed script, and the use of `waitFor` in async tests).

## Approval Status

Both Simeon's Pull Requests and mine were approved by the reviewing partner before merging into `lab1-staging`.
