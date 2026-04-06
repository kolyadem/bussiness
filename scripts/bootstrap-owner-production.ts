/**
 * Runs during Vercel build after `prisma generate` (see vercel.json).
 * Migrations are NOT run here — apply them separately (`npm run db:migrate`) to avoid advisory-lock races on Postgres.
 *
 * Idempotent: skips if MAIN_ADMIN_PASSWORD unset; does not fail the build if DB/schema is not ready yet.
 */
import "dotenv/config";
import { ensureOwnerAccount } from "@/lib/admin/ensure-owner-account";
import { disconnectPrisma } from "@/lib/db";
import { isPrismaRecoverableReadError } from "@/lib/prisma-build";

function isNonFatalBootstrapError(error: unknown): boolean {
  if (isPrismaRecoverableReadError(error)) {
    return true;
  }
  const text = error instanceof Error ? `${error.message} ${error.name}` : String(error);
  const lower = text.toLowerCase();
  if (lower.includes("advisory lock") || lower.includes("p1002") || lower.includes("timed out trying to acquire")) {
    return true;
  }
  return false;
}

async function main() {
  try {
    const result = await ensureOwnerAccount({ requirePassword: false });

    if (result.status === "skipped") {
      console.log(
        "[bootstrap-owner] Skipped: MAIN_ADMIN_PASSWORD is not set. Set MAIN_ADMIN_PASSWORD (and optional MAIN_ADMIN_*) in Vercel env to auto-create or update the owner on deploy.",
      );
      return;
    }

    console.log(`[bootstrap-owner] Owner ${result.action}: login=${result.login} email=${result.email}`);
  } catch (error) {
    if (isNonFatalBootstrapError(error)) {
      console.warn(
        "[bootstrap-owner] Skipped (DB not ready or schema not migrated yet). Run `npm run db:migrate` against production DATABASE_URL, then redeploy or run `npm run admin:ensure` locally.",
      );
      console.warn("[bootstrap-owner] Underlying error:", error);
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error("[bootstrap-owner] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
