# Lab 1 — AI Use and Reflection

I used Claude (Anthropic) as my AI coding assistant throughout Lab 1, via the Claude chat interface.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
|---|---|---|
| Diagnose PostgreSQL Install | Help me figure out why the PostgreSQL Windows service (postgresql-x64-17) is missing even though the installation folder exists. | This took a few back-and-forth steps since it was Windows-specific; the first install attempt had silently failed. |
| Set Up Git Branch Workflow | Explain and set up the Git branching model for Lab 1: main, lab1-staging, and one feature branch per Issue, with PRs going into lab1-staging. | Worked well in one pass — the "photos" analogy for Git commits made the workflow easy to follow. |
| Implement Health Check Endpoint | Add the GET /api/health endpoint to the Express backend, returning status "ok" and service "TokTickIT API", plus a Supertest test for it. | Straightforward, matched the required JSON shape from the lab sheet immediately. |
| Implement Category Model and Seed | Create the Prisma Category model (id, unique name, createdAt) and a seed script that inserts the four required categories idempotently. | Had to clarify that the seed needed to be safe to re-run — the first version used create() instead of upsert(). |
| Build Category List API and UI | Add GET /api/categories using Prisma, a Supertest test, and update the React UI to fetch and display real categories with loading and error states, not hard-coded values. | This was the most involved prompt; needed follow-ups to correctly handle the loading → success/error state transitions. |
| Debug Offline Screenshot Case | Walk me through how to demonstrate the "Offline" failure case for the required screenshot by stopping the backend. | Simple, clear step-by-step instructions worked immediately. |
| Set Up GitHub Project Board | Guide me through creating the GitHub Project board with the exact required Status field values in order: Backlog, Specified, Started, PR Review, Fixing, Done. | Needed to rename/reorder the default GitHub template statuses to match exactly. |
| Draft tests.md and ai_use.md | Help me write docs/lab-01/tests.md and ai_use.md based on my actual test files and AI usage during this lab. | Required going back to the real test file contents to keep the documentation accurate rather than generic. |

## Reflection

I relied heavily on AI throughout this lab, especially for the Git/GitHub workflow, which was new to me, and for the PostgreSQL setup problems on Windows. Most of the implementation code and tests were generated with AI assistance rather than written by me from scratch, then reviewed and pasted into the project. Being specific and copying the exact requirements from the lab sheet (JSON shapes, exact Kanban status names) generally worked better than vague prompts, which needed more back-and-forth to get right.
