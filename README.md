# Lumina Tech Storefront

Multilingual electronics storefront built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, next-intl and next-auth/Auth.js.

The project already includes:

- localized storefront for `uk / ru / en`
- catalog and product pages
- cart, wishlist and compare
- PC configurator with saved builds and share links
- build request flow
- admin panel for products, brands, categories, banners and global settings
- SEO foundation with localized metadata, sitemap, robots and structured data

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- SQLite by default
- next-intl
- next-auth/Auth.js

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create local env file:

```bash
copy .env.example .env
```

3. Bootstrap the local database and demo data:

```bash
npm run db:setup
```

4. Start development:

```bash
npm run dev
```

## Environment Variables

See [`.env.example`](/F:/bussiness/.env.example).

Core variables:

- `DATABASE_URL`: Prisma datasource, SQLite by default for local development
- `AUTH_SECRET`: required session/auth secret for production
- `NEXTAUTH_SECRET`: optional legacy alias if a deploy target still expects it
- `AUTH_URL`: app origin used by auth callbacks
- `NEXTAUTH_URL`: compatibility alias for NextAuth integrations
- `NEXT_PUBLIC_BASE_URL`: public origin used by canonical URLs, hreflang, sitemap, robots and social metadata

Optional operations variables:

- `IMPORT_SCHEDULER_SECRET`: protects `POST /api/internal/imports/schedule`
- `IMPORT_ALERT_WEBHOOK_URL`: optional alert webhook destination
- `IMPORT_ALERT_WEBHOOK_SECRET`: optional webhook signing secret
- `STORAGE_DRIVER`: current abstraction selector, `local` by default
- `STORAGE_LOCAL_DIR`: local writable directory under `public/`

## Database, Migrations and Seed

Primary local bootstrap:

```bash
npm run db:setup
```

This runs:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:seed
```

Daily development flow after schema changes:

```bash
npm run prisma:migrate -- --name your_change
npm run prisma:seed
```

Production migration flow:

```bash
npm run prisma:migrate:deploy
```

Notes:

- The checked-in migration history is now ordered as a clean baseline followed by incremental storefront/import migrations.
- Fresh environments should use Prisma migrations, not `prisma db push`.
- If you have an older local SQLite file created before the migration cleanup, recreate it or point `DATABASE_URL` to a fresh database before running `npm run prisma:migrate:deploy`.

## Development Commands

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run verify
npm run prisma:generate
npm run prisma:migrate -- --name your_change
npm run prisma:migrate:deploy
npm run prisma:seed
npm run db:setup
npm run admin:ensure
```

## Production Build

```bash
npm run build
npm run start
```

`build` runs Prisma client generation before `next build`.

## Deploy Notes

- Set `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL` to the real public origin before deployment.
- Run `npm run prisma:migrate:deploy` during deploy.
- Do not rely on `prisma db push` for production schema changes.
- Keep `AUTH_SECRET` stable between releases.
- The upload flow now goes through a storage abstraction layer. `local` storage still writes into `public/uploads/products` by default, and future `s3 / r2 / supabase` adapters can be wired into the same interface.
- If you stay on local storage, the deployment target still needs persistent writable storage for uploaded media.
- Shared configurator pages are intentionally `noindex` and excluded from indexing via metadata and robots rules.
- Cart, checkout, account, wishlist, compare, login and admin routes are also non-indexable/private.
- Login and configurator build-request flows now have lightweight rate limiting for basic abuse protection.
- Analytics events are logged through a simple internal foundation for `page_view`, `add_to_cart`, `configurator_open` and `build_request_submit`.
- Runtime logs and analytics events are written to `var/log/*.log`, which should be persisted or forwarded in real production.

Docker is intentionally not added at this stage to avoid overengineering a simple Node deployment story.

## Test Login

After running the seed:

- email: `admin@luminatech.store`
- password: `Admin12345!`

## Branding

Primary branding and global SEO settings are editable in the admin settings page:

- brand name
- meta title
- meta description
- support contacts
- favicon/logo references
- hero content

Static brand assets live in [`public/brand`](/F:/bussiness/public/brand).

## Localizations

Main localization sources:

- dictionaries: [`lib/i18n/messages.ts`](/F:/bussiness/lib/i18n/messages.ts)
- locale constants: [`lib/constants.ts`](/F:/bussiness/lib/constants.ts)
- locale routing: [`lib/i18n/routing.ts`](/F:/bussiness/lib/i18n/routing.ts)

## SEO Overview

The storefront now ships with:

- locale-aware canonical URLs
- locale-aware `hreflang` alternates for `uk`, `ru`, `en` plus `x-default`
- localized Open Graph and Twitter metadata
- generated `robots.txt`
- generated `sitemap.xml` with localized alternates
- JSON-LD for organization and website on the homepage
- JSON-LD for product and breadcrumbs on product pages
- `noindex` handling for private/utility pages

## Current Non-Ideal Production Areas

- There is still no real payment integration or external order management flow.
- Automated test coverage is not present yet; readiness currently relies on lint/build/runtime validation.
- The default local setup uses SQLite, so production databases with different engines still need env-level migration planning.
- External storage adapters are prepared conceptually via the abstraction layer, but only the local driver is implemented right now.
- The analytics/logging foundation currently writes to local log files and is not yet connected to a managed analytics or error-monitoring service.
