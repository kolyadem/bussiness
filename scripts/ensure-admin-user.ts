import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

/** Login field in DB (`User.login`). Prefer MAIN_ADMIN_USERNAME; MAIN_ADMIN_LOGIN is legacy alias. */
const ADMIN_USERNAME =
  process.env.MAIN_ADMIN_USERNAME?.trim() ||
  process.env.MAIN_ADMIN_LOGIN?.trim() ||
  "kolyadem1";

const ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL?.trim() || "kolyadem2@gmail.com";
const ADMIN_PASSWORD = process.env.MAIN_ADMIN_PASSWORD?.trim();
const ADMIN_NAME = process.env.MAIN_ADMIN_NAME?.trim() || "Admin";

async function main() {
  if (!ADMIN_PASSWORD) {
    throw new Error("MAIN_ADMIN_PASSWORD is required (set in .env before running npm run admin:ensure).");
  }
  const passwordHash = await hash(ADMIN_PASSWORD, 12);

  const existing = await db.user.findFirst({
    where: {
      OR: [{ email: ADMIN_EMAIL }, { login: ADMIN_USERNAME }],
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await db.user.update({
      where: {
        id: existing.id,
      },
      data: {
        login: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "ADMIN",
        locale: "uk",
      },
    });
  } else {
    await db.user.create({
      data: {
        login: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "ADMIN",
        locale: "uk",
      },
    });
  }

  console.log("Owner/admin user is ready.");
  console.log(`Login (username): ${ADMIN_USERNAME}`);
  console.log(`Email: ${ADMIN_EMAIL}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
