import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const ADMIN_EMAIL = process.env.MAIN_ADMIN_EMAIL?.trim() || "kolyadem1@lumina.local";
const ADMIN_LOGIN = process.env.MAIN_ADMIN_LOGIN?.trim() || "kolyadem1";
const ADMIN_PASSWORD = process.env.MAIN_ADMIN_PASSWORD?.trim() || "lumina228krasava1337";
const ADMIN_NAME = process.env.MAIN_ADMIN_NAME?.trim() || "Kolyadem Owner";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  const existing = await db.user.findFirst({
    where: {
      OR: [{ email: ADMIN_EMAIL }, { login: ADMIN_LOGIN }],
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
        login: ADMIN_LOGIN,
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
        login: ADMIN_LOGIN,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "ADMIN",
        locale: "uk",
      },
    });
  }

  console.log("Main admin user is ready.");
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Login: ${ADMIN_LOGIN}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
