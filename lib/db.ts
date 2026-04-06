import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var luminaPrismaClientV2: PrismaClient | undefined;
  var luminaPgPool: Pool | undefined;
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Use a PostgreSQL URL (e.g. Neon). Local example: postgresql://user:pass@localhost:5432/dbname",
    );
  }
  return url;
}

function getPool(): Pool {
  if (globalThis.luminaPgPool) {
    return globalThis.luminaPgPool;
  }
  const connectionString = requireDatabaseUrl();
  const created = new Pool({
    connectionString,
    // Serverless: keep pool small; use the hoster's pooler URL (e.g. Neon pooler + ?pgbouncer=true).
    max: process.env.VERCEL ? 5 : 20,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });
  globalThis.luminaPgPool = created;
  return created;
}

function createPrismaClient(): PrismaClient {
  const pool = getPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (!globalThis.luminaPrismaClientV2) {
    globalThis.luminaPrismaClientV2 = createPrismaClient();
  }
  return globalThis.luminaPrismaClientV2;
}

/**
 * Lazy Prisma client: no DATABASE_URL / pool until the first query. This keeps
 * `next build` and tooling that import this module from failing when env is absent.
 */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client as object, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
