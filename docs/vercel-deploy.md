# Vercel deployment

## Database

- **SQLite `file:./prisma/dev.db` is for local development only.** The file is gitignored; Vercel’s filesystem is not a durable SQLite host for production.
- For production, set **`DATABASE_URL`** to a hosted database (e.g. Neon, Supabase, PlanetScale, Turso). Use a **PostgreSQL**-compatible URL if you switch the Prisma provider in `schema.prisma` accordingly, or use a SQLite-compatible hosted URL for Turso.
- After changing the datasource, run **`prisma migrate deploy`** against that URL (e.g. in Vercel “Build Command”: `prisma generate && prisma migrate deploy && next build`, with `DATABASE_URL` configured in project env).

## Build without a migrated DB

- The app uses **`dynamic = "force-dynamic"`** on the locale layout so storefront/admin pages are not statically generated at build time against a missing DB.
- **`app/sitemap.ts`** is dynamic and falls back to static URLs if product queries fail (e.g. empty schema).

## Environment variables

Configure in the Vercel project (Production / Preview):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Required at runtime for storefront/admin; use a production DB URL. |
| `AUTH_SECRET` | Required for Auth.js session signing. |
| `NEXTAUTH_URL` / `AUTH_URL` | Public origin of the app (e.g. `https://your-app.vercel.app`). |
| `NEXT_PUBLIC_BASE_URL` | Same origin for canonical URLs, sitemap, OG. |
| `IMPORT_SCHEDULER_SECRET` | Optional; only if you call the import scheduler API. |
| `TELEGRAM_*` | Optional; Telegram notifications. |

See `.env.example` for placeholders. Do not commit real secrets.
