# Deploy: local + Vercel

PostgreSQL only (`prisma/schema.prisma` → `provider = "postgresql"`). No SQLite.

## A) Local `.env` (copy from `.env.example`)

Set at minimum:

- `DATABASE_URL` — local Postgres, Neon dev branch, or Docker.
- `AUTH_SECRET` — long random string.
- `NEXTAUTH_URL`, `AUTH_URL`, `NEXT_PUBLIC_BASE_URL` — `http://localhost:3000`.
- `IMPORT_SCHEDULER_SECRET` — any random string (cron route checks it).
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BUILD_REQUEST_CHAT_ID` — leave empty if unused.
- `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR` — defaults are fine.
- **`MAIN_ADMIN_PASSWORD`** (+ optional `MAIN_ADMIN_USERNAME`, `MAIN_ADMIN_EMAIL`, `MAIN_ADMIN_NAME`) — for `npm run admin:ensure` or to mirror Vercel.

## B) Owner auto-bootstrap on Vercel

Each production **build** runs (see `vercel.json`):

`prisma migrate deploy` → `prisma generate` → **`npm run bootstrap:owner`** → `next build`

- **`bootstrap:owner`** runs `scripts/bootstrap-owner-production.ts`, which calls `lib/admin/ensure-owner-account.ts`.
- If **`MAIN_ADMIN_PASSWORD`** is set in Vercel env: creates the owner **once**, or **updates** the same user on later deploys (same email/login lookup — **no duplicates**).
- If **`MAIN_ADMIN_PASSWORD`** is **not** set: step **exits successfully** and prints a clear log; **no** owner is created.

Defaults when env vars are omitted: `MAIN_ADMIN_USERNAME=kolyadem1`, `MAIN_ADMIN_EMAIL=kolyadem2@gmail.com`, `MAIN_ADMIN_NAME=Admin` (password only ever from env, never hardcoded).

## C) Vercel environment variables

In **Project → Settings → Environment Variables** (Production + Preview as needed):

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Neon pooled URL (or equivalent). |
| `AUTH_SECRET` | Long random secret. |
| `NEXTAUTH_URL`, `AUTH_URL`, `NEXT_PUBLIC_BASE_URL` | `https://your-project.vercel.app` or custom domain. |
| `MAIN_ADMIN_PASSWORD` | **Set this** to auto-create/update owner on deploy. |
| `MAIN_ADMIN_USERNAME` | Optional; default `kolyadem1`. |
| `MAIN_ADMIN_EMAIL` | Optional; default `kolyadem2@gmail.com`. |
| `MAIN_ADMIN_NAME` | Optional; default `Admin`. |
| `IMPORT_SCHEDULER_SECRET` | If you use import cron. |
| `TELEGRAM_*` | Optional. |

Do **not** commit real secrets.

## D) Commands from a clean clone (local)

1. `npm install`
2. `npm run db:prepare` — applies migrations + `prisma generate`
3. (Optional) `npm run prisma:seed` — seed data + demo catalog
4. `npm run admin:ensure` — same as bootstrap logic, but **requires** password in `.env` (CLI)
5. `npm run dev`

Or use `npm run bootstrap:owner` locally after `db:prepare` (skips if no password).

## E) After connecting the Git repo on Vercel

1. Add env vars (section C), especially **`DATABASE_URL`**, **`AUTH_SECRET`**, public URLs, and **`MAIN_ADMIN_PASSWORD`** for owner auto-creation.
2. Deploy. Build runs migrations, then owner bootstrap, then Next build.
3. **Optional:** `npm run prisma:seed` from a machine with `DATABASE_URL` pointing at Neon if you want demo catalog.

## F) Reference scripts

| Script | Purpose |
|--------|---------|
| `npm run db:prepare` | `prisma migrate deploy` + `prisma generate` |
| `npm run db:setup` | `db:prepare` + `prisma:seed` |
| `npm run bootstrap:owner` | Idempotent owner upsert (skips if no `MAIN_ADMIN_PASSWORD`) |
| `npm run build` | `prisma generate && next build` (no migrate — quick checks) |
| `npm run build:with-migrate` | Same pipeline as Vercel (migrate + generate + bootstrap + next build) |

## G) Routing note

`proxy.ts` (Next.js 16) handles locale redirects; `/` should redirect to **`/uk`**. Missing `proxy.ts` can cause 404 on `/`.
