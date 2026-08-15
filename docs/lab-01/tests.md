# Lab 1 — Tests

Test File: `tests/lab-01/`

| Test ID | Tool      | Test Description                                      |
|---------|-----------|--------------------------------------------------------|
| API-01  | Supertest | Health endpoint returns 200 and expected JSON           |
| API-02  | Supertest | Categories endpoint returns the four seeded categories  |
| UI-01   | Vitest    | TokTickIT heading renders                                |
| UI-02   | Vitest    | Loading state changes to system status and category list on success |
| UI-03   | Vitest    | API failure displays a useful "Offline" error message   |

## Test file locations

- `server/tests/lab-01/health.test.ts` → API-01
- `server/tests/lab-01/categories.test.ts` → API-02
- `client/tests/lab-01/App.test.tsx` → UI-01, UI-02, UI-03

## Result

All 5 tests pass locally (`npm test` in `server/` and `client/`).
