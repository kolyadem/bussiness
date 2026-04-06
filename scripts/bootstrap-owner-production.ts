/**
 * Runs on Vercel after `prisma migrate deploy` (see vercel.json).
 * Idempotent: safe on every deploy; skips with a clear log if MAIN_ADMIN_PASSWORD is unset.
 */
import "dotenv/config";
import { ensureOwnerAccount } from "@/lib/admin/ensure-owner-account";
import { db } from "@/lib/db";

async function main() {
  const result = await ensureOwnerAccount({ requirePassword: false });

  if (result.status === "skipped") {
    console.log(
      "[bootstrap-owner] Skipped: MAIN_ADMIN_PASSWORD is not set. Set MAIN_ADMIN_PASSWORD (and optional MAIN_ADMIN_*) in Vercel env to auto-create or update the owner on deploy.",
    );
    return;
  }

  console.log(`[bootstrap-owner] Owner ${result.action}: login=${result.login} email=${result.email}`);
}

main()
  .catch((error) => {
    console.error("[bootstrap-owner] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
