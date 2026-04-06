import "dotenv/config";
import { ensureOwnerAccount } from "@/lib/admin/ensure-owner-account";
import { disconnectPrisma } from "@/lib/db";

async function main() {
  const result = await ensureOwnerAccount({ requirePassword: true });
  if (result.status !== "ok") {
    throw new Error("MAIN_ADMIN_PASSWORD is required (set in .env before running npm run admin:ensure).");
  }
  console.log("Owner/admin user is ready.");
  console.log(`Login (username): ${result.login}`);
  console.log(`Email: ${result.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
