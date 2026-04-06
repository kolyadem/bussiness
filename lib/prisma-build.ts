import { Prisma } from "@prisma/client";

/**
 * True when the failure is expected if the DB file is missing, migrations were not applied,
 * or the schema is empty (e.g. Vercel build without DATABASE_URL pointing at a migrated DB).
 * In those cases callers may fall back to static defaults instead of crashing the build.
 */
export function isPrismaRecoverableBuildTimeError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      error.code === "P2021" ||
      error.code === "P2022" ||
      error.code === "P2010" ||
      error.code === "P1001" ||
      error.code === "P1003"
    );
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return true;
  }
  return false;
}

/** Serialize nested causes for pg / driver-adapter / minified bundles. */
function fullErrorText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current != null && depth < 6) {
    if (current instanceof Error) {
      parts.push(current.message, current.name, String((current as { code?: string }).code ?? ""));
      current = (current as Error & { cause?: unknown }).cause;
    } else if (typeof current === "object" && current !== null && "message" in current) {
      parts.push(String((current as { message?: unknown }).message));
      current = "cause" in current ? (current as { cause?: unknown }).cause : null;
    } else {
      parts.push(String(current));
      break;
    }
    depth += 1;
  }
  return parts.join(" ").toLowerCase();
}

/** Postgres/pg: undefined_table and similar when a relation was never migrated. */
function isMissingRelationMessage(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes("42p01")) {
    return true;
  }
  if (m.includes("relation") && m.includes("does not exist")) {
    return true;
  }
  if (m.includes("no such table")) {
    return true;
  }
  if (m.includes("sitesettings") && (m.includes("does not exist") || m.includes("undefined"))) {
    return true;
  }
  if ((m.includes("table") || m.includes("relation")) && m.includes("does not exist")) {
    return true;
  }
  if (m.includes("p2021")) {
    return true;
  }
  return false;
}

/**
 * True when a read-only query failed because the schema/table is missing or the driver wrapped the error.
 * Use for storefront fallbacks (e.g. SiteSettings) so a non-migrated Neon DB does not crash the page.
 */
export function isPrismaRecoverableReadError(error: unknown): boolean {
  if (isPrismaRecoverableBuildTimeError(error)) {
    return true;
  }
  const blob = fullErrorText(error);
  if (isMissingRelationMessage(blob)) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return isMissingRelationMessage(error.message) || isMissingRelationMessage(blob);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022" || error.code === "P2010") {
      return true;
    }
  }
  if (error instanceof Error) {
    if (isMissingRelationMessage(error.message)) {
      return true;
    }
    const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
    if (cause instanceof Error && isMissingRelationMessage(cause.message)) {
      return true;
    }
    if ((error as { name?: string }).name === "DriverAdapterError" && cause instanceof Error) {
      return isMissingRelationMessage(cause.message);
    }
  }
  return false;
}

/**
 * Runtime/storefront: when the DB file is empty, migrations were not applied, or the connection fails,
 * return {@link fallback} instead of crashing the request (e.g. Vercel without a migrated SQLite).
 */
export async function withPrismaFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isPrismaRecoverableReadError(error)) {
      return fallback;
    }
    throw error;
  }
}
