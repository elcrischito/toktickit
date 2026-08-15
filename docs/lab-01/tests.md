# Lab 1 — Tests

TokTickIT — vertical slice: `/api/health` and `/api/categories`.

## Backend (Supertest + Vitest)

### `server/tests/lab-01/health.test.ts`
**GET /api/health**
- *returns 200 with status ok and the service name*
  Asserts the response status is `200` and the body strictly equals `{ status: "ok", service: "TokTickIT API" }`.

### `server/tests/lab-01/categories.test.ts`
**GET /api/categories**
- *returns the four seeded categories in id order*
  Asserts the response status is `200` and the category names, in order, equal:
  `["Account and Access", "Hardware", "Software", "Network"]`.

## Frontend (Vitest + React Testing Library)

### `client/tests/lab-01/App.test.tsx`
**App**
- *renders the TokTickIT heading*
  Renders `<App />` and asserts the text "TokTickIT" is present.

- *shows Online and the seeded categories on success*
  Mocks `api.checkSystem` to resolve with `{ online: true, categories: [...] }` (4 seeded categories), clicks "Check System", and asserts "Online" and "Hardware" appear on screen.

- *shows an Offline error message when the API is unavailable*
  Mocks `api.checkSystem` to reject with an error, clicks "Check System", and asserts "Offline" appears on screen (error state).

## Summary

| Layer    | File                  | Tests |
|----------|-----------------------|-------|
| Backend  | health.test.ts        | 1     |
| Backend  | categories.test.ts    | 1     |
| Frontend | App.test.tsx          | 3     |
| **Total**|                        | **5** |

All 5 tests pass locally (`npm test` in `server/` and `client/`).
