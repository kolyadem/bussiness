# Vercel + Neon (PostgreSQL)

## Overview

- **Locales:** URLs use a locale prefix (`/uk`, `/ru`, `/en`). The root **`proxy.ts`** (Next.js 16; replaces `middleware.ts`) runs **next-intl** so `/` redirects to **`/uk`**. Visiting `/` without this file yields **404**.
- The app uses **PostgreSQL** via Prisma 7 and `@prisma/adapter-pg` (`lib/db.ts`). **SQLite / `file:./prisma/dev.db` is no longer used.**
- **Default site mode** is **`PC_BUILD`** (configurator / build-first UX). `SiteSettings.siteMode` defaults to `PC_BUILD`; use **Admin → Settings → Site mode** to switch to classic **`STORE`** if needed. Migration `20260406120000_site_mode_default_pc_build` sets existing rows to `PC_BUILD` when they were `STORE`.
- **Neon** is connected through Vercel (integration): add the **`DATABASE_URL`** env var in the Vercel project (Production / Preview). Use the **pooled** connection string from Neon unless Neon docs say otherwise for Prisma.
- **Build** on Vercel runs migrations from `vercel.json`: `prisma migrate deploy && prisma generate && next build`. The Neon DB must exist and `DATABASE_URL` must be set **before** the build so migrations can apply.

## Required environment variables

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres URL (`postgresql://...`). From Neon dashboard or Vercel Neon integration. |
| `AUTH_SECRET` | Yes | Long random string for signing sessions. |
| `NEXTAUTH_URL` / `AUTH_URL` | Yes in prod | Public site URL, e.g. `https://your-app.vercel.app`. |
| `NEXT_PUBLIC_BASE_URL` | Yes | Same origin for canonical URLs, sitemap, OG. |
| `IMPORT_SCHEDULER_SECRET` | If you use cron imports | Protects `/api/internal/imports/schedule`. |
| `TELEGRAM_*` | Optional | Build-request notifications. |

Copy from `.env.example` and replace placeholders. Do not commit real secrets.

## First deploy (empty Neon DB)

1. In Vercel → Project → Settings → Environment Variables: set `DATABASE_URL` (and auth/public URLs). Link the Neon integration if you use it.
2. Deploy. The build runs **`prisma migrate deploy`**, which applies `prisma/migrations/*/migration.sql` to Neon.
3. **Populate data** (otherwise the storefront is an empty shell with graceful fallbacks):
   - From a machine with `DATABASE_URL` pointing at Neon:
     - `npm run prisma:seed` (or `npx prisma db seed`) — storefront seed + demo catalog (see `prisma/seed-storefront.ts`).
     - Optionally `npm run admin:ensure` (requires `MAIN_ADMIN_PASSWORD`; defaults: `MAIN_ADMIN_USERNAME=kolyadem1`, `MAIN_ADMIN_EMAIL=kolyadem2@gmail.com` via `.env` / `.env.example`).
   - Or use existing import scripts (`catalog:*`, admin import) as documented in `package.json`.

## Local development

1. Create a Postgres database (Neon dev branch, Docker, or local install).
2. Copy `.env.example` → `.env` and set `DATABASE_URL` (and `AUTH_SECRET`, URLs).
3. Apply schema: `npx prisma migrate deploy` (or `npx prisma migrate dev` when creating new migrations).
4. Optional: `npm run prisma:seed` then `npm run admin:ensure` (set `MAIN_ADMIN_PASSWORD` and optionally `MAIN_ADMIN_USERNAME` / `MAIN_ADMIN_EMAIL` in `.env`).
5. `npm run dev`.

Local **`npm run build`** expects `DATABASE_URL` in `.env` because the app loads `lib/db.ts` at runtime.

## Commands reference

| Command | Purpose |
|---------|---------|
| `npx prisma migrate deploy` | Apply migrations to the DB (production / CI / Neon). |
| `npx prisma migrate dev` | Create a new migration in dev when you change `schema.prisma`. |
| `npm run prisma:seed` | Run `prisma/seed-storefront.ts` (requires `DATABASE_URL`). |
| `npm run build:with-migrate` | Same as Vercel build: migrate + generate + next build (use when testing deploy locally). |

## Build without running migrations

- Default **`npm run build`** is `prisma generate && next build` (no migrations). Vercel uses **`vercel.json`** `buildCommand` to include `prisma migrate deploy`.

## Empty database behavior

- If tables are missing or the DB is empty, existing **graceful fallbacks** in storefront queries avoid crashing; you still need **migrations** for a working schema and **seed/import** for a real catalog.
