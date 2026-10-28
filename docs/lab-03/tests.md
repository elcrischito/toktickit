# Sprint 3 Test Plan — TokTickIT

| Test ID | Type | Req / AC | What It Tests | Expected Result | Automated Test File | Status |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login | Authenticated token & user data returned | server/tests/lab-03/auth.api.test.ts | Planned |
| API-02 | API | AC-02 | Mandatory password change | Block access until password updated | server/tests/lab-03/auth.api.test.ts | Planned |
| API-03 | API | AC-03 | Requester ticket scope | Users only see their own tickets | server/tests/lab-03/authorization.api.test.ts | Planned |
| API-04 | API | AC-04 | Internal Notes restriction | 403 Forbidden for Requesters | server/tests/lab-03/comments-notes.api.test.ts | Planned |
| API-05 | API | AC-05 | Admin safety rules | Self-deactivation blocked | server/tests/lab-03/users-admin.api.test.ts | Planned |
| E2E-01 | E2E | AC-01 | Login & Session UI | Navigates to dashboard upon login | e2e/lab-03/authentication.spec.ts | Planned |
| E2E-02 | E2E | AC-02 | Password change workflow | Forces user to reset initial password | e2e/lab-03/authentication.spec.ts | Planned |
| E2E-03 | E2E | AC-04 | IT Queue & Detail Flow | Staff claims ticket and posts comment | e2e/lab-03/staff-ticket-flow.spec.ts | Planned |
| E2E-04 | E2E | AC-05 | User Administration Flow | Admin creates and updates user | e2e/lab-03/user-administration.spec.ts | Planned |
