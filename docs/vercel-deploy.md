# Deploy: local + Vercel

PostgreSQL only (`prisma/schema.prisma` → `provider = "postgresql"`). No SQLite.

## Node.js

- **`package.json`** → `"engines": { "node": ">=20.9.0 <21" }` so Vercel stays on **Node 20.x** (no open-ended major that auto-upgrades to the next major).
- **`.nvmrc`** → `20` — use `nvm use` / `fnm use` locally for the same line as production.
- **`tsx`** is a **runtime dependency** so `npm run bootstrap:owner` always has the runner on Vercel (not only devDependencies).

## Migrations (production) — **not** inside the Vercel build

Running `prisma migrate deploy` on **every** Vercel build can fail with **P1002** (Postgres advisory lock timeout) when deploys overlap or another client holds the migration lock.

**Do this instead:**

1. Apply migrations **separately**, against the same `DATABASE_URL` as production — **one job at a time** (local shell, CI workflow, or Neon SQL editor is fine; avoid two migrate deploys at once).
2. Typical command (from your machine with prod `DATABASE_URL` in `.env`):

   ```bash
   npm run db:migrate
   ```

   or: `npx prisma migrate deploy`

3. Run migrations **when the Prisma schema / `prisma/migrations` change**, or before the **first** deploy to an empty database.
4. After migrations are applied, **Redeploy** on Vercel if needed; the app build does **not** run `migrate deploy`.

## A) Local `.env` (copy from `.env.example`)

Set at minimum:

- `DATABASE_URL` — local Postgres, Neon dev branch, or Docker.
- `AUTH_SECRET` — long random string.
- `NEXTAUTH_URL`, `AUTH_URL`, `NEXT_PUBLIC_BASE_URL` — `http://localhost:3000`.
- `IMPORT_SCHEDULER_SECRET` — any random string (cron route checks it).
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BUILD_REQUEST_CHAT_ID` — leave empty if unused.
- `STORAGE_DRIVER`, `STORAGE_LOCAL_DIR` — defaults are fine.
- **`MAIN_ADMIN_PASSWORD`** (+ optional `MAIN_ADMIN_USERNAME`, `MAIN_ADMIN_EMAIL`, `MAIN_ADMIN_NAME`) — for `npm run admin:ensure` or to mirror Vercel.

## B) Vercel build pipeline (`vercel.json`)

Each deploy **build** runs:

`prisma generate` → **`npm run bootstrap:owner`** → `next build`

- **No** `prisma migrate deploy` here (avoids advisory-lock races on Postgres).
- **`bootstrap:owner`** calls `lib/admin/ensure-owner-account.ts`.
- If **`MAIN_ADMIN_PASSWORD`** is set: creates or updates the owner (no duplicates).
- If **`MAIN_ADMIN_PASSWORD`** is unset: exits **0** with a log.
- If the DB is empty / migrations not applied yet: bootstrap logs a warning and exits **0** so the build still completes; run **`npm run db:migrate`** against prod, then redeploy or use **`npm run admin:ensure`** locally.

Defaults when env vars are omitted: `MAIN_ADMIN_USERNAME=kolyadem1`, `MAIN_ADMIN_EMAIL=kolyadem2@gmail.com`, `MAIN_ADMIN_NAME=Admin` (password only from env).

## C) Vercel environment variables

**Project → Settings → Environment Variables** (Production + Preview as needed). Do **not** commit real secrets.

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | **Yes** | Runtime + optional owner bootstrap. Apply migrations **outside** the Vercel build (see **Migrations** above). |
| `AUTH_SECRET` | **Yes** | NextAuth refuses production without it. |
| `NEXTAUTH_URL`, `AUTH_URL`, `NEXT_PUBLIC_BASE_URL` | **Strongly recommended** | `https://your-project.vercel.app` (or domain). Else SEO/metadata fall back to `http://localhost:3000`. |
| `MAIN_ADMIN_PASSWORD` | Optional | Set to auto-create/update owner on deploy. If unset, bootstrap skips (exit 0). |
| `MAIN_ADMIN_USERNAME` | Optional | Default `kolyadem1`. |
| `MAIN_ADMIN_EMAIL` | Optional | Default `kolyadem2@gmail.com`. |
| `MAIN_ADMIN_NAME` | Optional | Default `Admin`. |
| `IMPORT_SCHEDULER_SECRET` | If cron imports | Protects `POST /api/internal/imports/schedule`. |
| `TELEGRAM_*` | Optional | Build-request notifications. |

## D) Commands from a clean clone (local)

1. `npm install`
2. `npm run db:prepare` — applies migrations + `prisma generate`
3. (Optional) `npm run prisma:seed` — seed data + demo catalog
4. `npm run admin:ensure` — same as bootstrap logic, but **requires** password in `.env` (CLI)
5. `npm run dev`

Or use `npm run bootstrap:owner` locally after `db:prepare` (skips if no password).

## E) After connecting the Git repo on Vercel

1. Add env vars (section C), especially **`DATABASE_URL`**, **`AUTH_SECRET`**, public URLs, and optionally **`MAIN_ADMIN_PASSWORD`**.
2. **First time / schema changes:** run **`npm run db:migrate`** (or `npx prisma migrate deploy`) **locally or in CI** with production `DATABASE_URL` — **once**, no concurrent migrate jobs.
3. **Deploy** on Vercel (build: generate → bootstrap → `next build` only).
4. **Optional:** `npm run prisma:seed` from a machine with `DATABASE_URL` pointing at Neon if you want demo catalog.

## F) Reference scripts

| Script | Purpose |
|--------|---------|
| `npm run db:prepare` | `prisma migrate deploy` + `prisma generate` |
| `npm run db:setup` | `db:prepare` + `prisma:seed` |
| `npm run bootstrap:owner` | Idempotent owner upsert (skips if no `MAIN_ADMIN_PASSWORD`) |
| `npm run build` | `prisma generate && next build` (no migrate, no bootstrap — quick checks) |
| `npm run build:vercel` | Same as Vercel: `generate` + `bootstrap:owner` + `next build` (no migrate) |
| `npm run build:with-migrate` | **Local/CI only:** full stack including `migrate deploy` (use to test; not used by Vercel) |

## G) Routing note

`proxy.ts` (Next.js 16) handles locale redirects; `/` should redirect to **`/uk`**. Missing `proxy.ts` can cause 404 on `/`.
