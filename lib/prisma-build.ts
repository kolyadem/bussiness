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
