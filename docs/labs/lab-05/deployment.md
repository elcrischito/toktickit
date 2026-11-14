# TokTickIT — Deployment (Lab 5)

Team **EN-049_P7** · one member: elcrischito · Repository: https://github.com/elcrischito/toktickit (public)

> **Status (14 Nov 2026).** Docker, CI on every Pull Request, and the deploy scripts are in place and tested.
> The Google Cloud part (first deployment, Workload Identity Federation, auto-deploy, persistence check) is waiting for a working GCP Free Trial account. See the course announcement of 14 Nov 2026 about Google Cloud access.
> Every section marked **(after GCP)** is filled in once the project exists.

## 1. Stack and changes from the reference

| Part | What we use | Same as the Starter Kit? |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | yes |
| API | Node.js + Express + TypeScript, built with `tsc` (type check) + esbuild (bundle → `server/dist/index.js`) | build step differs: the kit uses `tsc` only, but this code base uses extension-less ES module imports that plain `tsc` output cannot run |
| Database | PostgreSQL 16 + Prisma 5 | yes |
| Container | one image (`Dockerfile`): the API also serves the built React app on `PORT` | yes |
| Cloud | Artifact Registry, Cloud Run (service + migration job), Cloud SQL for PostgreSQL, Secret Manager | yes |
| CI/CD | GitHub Actions: `ci-docker.yml` (job `test-and-docker`), `deploy.yml` (from #43) | yes; CI also runs on PRs into `staging` |
| Sign-in from GitHub to GCP | Workload Identity Federation, no JSON key | yes |
| Extra secret | `JWT_SECRET` in Secret Manager (`toktickit-jwt-secret`) | **added**: TokTickIT signs login tokens with it, and the server refuses to start in production without it |
| Attachments | stored in PostgreSQL (`Attachment.data`) | yes (kit guidance: no files in the container) |

**Team of one.** The handout asks for teammate reviews (R-09) and work by both members (R-11). EN-049_P7 has a single member, so every Pull Request gets a self-check comment that states what was verified (tests run, log read, secrets checked). The author never approves their own PR, because GitHub does not allow it.

## 2. Environment variables

Every variable the code reads (`process.env` in `server/src` and `server/prisma`). The client reads none: it calls `/api` on the same origin.

| Variable | Purpose | Secret? | Local value comes from | Cloud value comes from |
|---|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | **yes** | `server/.env` (copy of `.env.example`) | Secret Manager `toktickit-database-url` (created by `deploy.sh`, random DB password) |
| `JWT_SECRET` | signs login tokens; required in production | **yes** | `server/.env` | Secret Manager `toktickit-jwt-secret` (random, created by `deploy.sh`) |
| `ADMIN_PASSWORD` | first password of `admin@toktickit.com` (must be changed at first login); required for the seed in production | **yes** | optional; local fallback outside production | Secret Manager `toktickit-admin-password` (generated, never printed) |
| `DEMO_USER_PASSWORD` | password of the demo users for the Lab 6 UAT | **yes** | optional; local fallback outside production | Secret Manager `toktickit-demo-password` (only with `deploy.sh --demo`) |
| `SEED_DEMO_DATA` | seed demo users and sample tickets | no | default `true` outside production | migration job env var (`true` only with `--demo`) |
| `NODE_ENV` | runtime mode | no | unset (development) | `production` (deploy.sh) |
| `PORT` | port the server listens on | no | `5000` (Vite proxy target) | `3000` (Dockerfile, `--port 3000`) |
| `TZ` | time zone | no | system | `Asia/Bangkok` |
| `CORS_ORIGIN` | allowed origins, comma-separated; optional | no | unset | unset (UI and API share one origin) |
| `CLIENT_DIST_DIR` | folder of the built React app; optional | no | unset | unset (default `/app/client/dist` in the image) |

No real value of any secret is committed. `.env` is in `.gitignore`; only `server/.env.example` and `client/.env.example` (placeholders) are in the repository.

## 3. Commands

### Local, without Docker
```bash
docker start toktickit-db                 # or any PostgreSQL 16 on localhost:5432
cd server && cp .env.example .env && npm ci
npx prisma migrate deploy && npm run prisma:seed
npm test                                  # 58 API tests
npm run dev                               # http://localhost:5000
cd ../client && npm ci && npm test && npm run dev   # http://localhost:5173
```

### Local, with Docker Compose (fresh clone, C-03)
```bash
git clone https://github.com/elcrischito/toktickit && cd toktickit
docker compose up --build -d
docker compose ps -a                      # db, server, client running; migrate exited (0)
curl --fail http://localhost:3000/api/health
curl --fail http://localhost:3000/api/ready
# UI: http://localhost:5173  — admin@toktickit.com / ADMIN_PASSWORD (default for Compose: AdminInitial123!)
docker compose down && docker compose up -d   # data is still there (named volume)
```

### Production image
```bash
docker build -t toktickit .               # what CI and Cloud Run build
```

### Migrations and seed
- Migrations are additive Prisma migrations in `server/prisma/migrations/`.
- Locally: `npx prisma migrate deploy && npm run prisma:seed`.
- In the cloud they run in the Cloud Run job `toktickit-migrate` (same image) before the service is updated. The seed is safe to rerun: it never resets an existing admin password in production.

## 4. GCP project and resources (after GCP)

| Item | Value |
|---|---|
| Project ID | _to fill (e.g. `cpe334-en049-p7`)_ |
| Region | `asia-southeast1` |
| Artifact Registry repository | `toktickit` |
| Cloud Run service | `toktickit` (min instances 0, max 3, 512 MiB) |
| Cloud Run job (migrations + seed) | `toktickit-migrate` |
| Cloud SQL instance / database / user | `toktickit-pg` (PostgreSQL 16, `db-f1-micro`, enterprise) / `toktickit` / `toktickit` |
| Runtime service account | `toktickit-runner@PROJECT_ID.iam.gserviceaccount.com` |
| Deploy service account (CI) | `toktickit-deployer@PROJECT_ID.iam.gserviceaccount.com` |
| Secrets | `toktickit-database-url`, `toktickit-jwt-secret`, `toktickit-admin-password`, `toktickit-demo-password` |
| GitHub environment | `demo` (deployable from `main` only), variables `GCP_PROJECT_ID`, `GCP_REGION`, `WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT` |
| Public URL | _to fill_ |

Cost control: an alerts-only budget is created before any resource. Cloud SQL is billed every hour it exists, so the instance is stopped when idle (Student Guide Episode 9) and `deploy/teardown.sh` removes everything at the end of the course.

## 5. Release procedure

```
feature/fix branch ──PR + CI──▶ staging ──release PR + CI──▶ main ──deploy.yml──▶ Cloud Run
```

1. Open or pick an Issue with the `lab5` label (or the sprint label) and move it to *In Progress*.
2. Branch from `staging`: `git switch staging && git pull && git switch -c <type>/<issue>-<name>`.
3. Push and open a PR into `staging`. CI (`test-and-docker`) must pass. Add a review comment that states what was checked, then merge.
4. Open a release PR **`staging` → `main`**. CI runs again. `main` is protected by a ruleset: PR required, `test-and-docker` required, branch up to date, no bypass.
5. Merge the release PR. **(after GCP)** `deploy.yml` then runs on `main`: CI again → `docker build` tagged with the **full commit SHA** → push to Artifact Registry → migration job → Cloud Run update **by image digest** → smoke test (`deploy/smoke_test.py`).
6. Check the run summary: commit tag, image digest, URL, smoke test result.

### Which commit is running? (R-08, after GCP)
- GitHub → Actions → *Deploy demo* → latest run on `main` → summary shows the commit SHA, the digest and the URL.
- Or from Cloud Shell:
  ```bash
  gcloud run services describe toktickit --region asia-southeast1 \
    --format='value(spec.template.spec.containers[0].image,status.latestReadyRevisionName)'
  gcloud artifacts docker images list asia-southeast1-docker.pkg.dev/PROJECT_ID/toktickit/toktickit \
    --include-tags --filter="DIGEST=<digest from above>"
  ```
  The tag of that digest is the full commit SHA of the release.

### Rollback (after GCP)
Actions → *Deploy demo* → *Run workflow* on `main` → enter the full 40-character SHA of the last good release. Tests, build and migrations are skipped, and that image is deployed and smoke-tested. Migrations stay additive, so an older image still works with the newer schema.

## 6. Evidence index (filled as the work is done)

| Rubric part | Artifact / link | IDs / version | Result |
|---|---|---|---|
| 1. CI | CI run on PR #47 | run 43575366833 | `test-and-docker` passed: backend 58 tests, frontend 26 tests, deploy-script tests, Docker build |
| 1. Quality gate | ruleset on `main` + failing PR from a temporary branch | _to fill_ | _merge blocked_ |
| 2. Docker | `Dockerfile`, `.dockerignore`, `docker-compose.yml` (PR #46), built in CI | — | image builds |
| 3. GCP | _after GCP_ | | |
| 4. Release | Issue → PR into `staging` → release PR into `main` → deploy run | _to fill_ | |
