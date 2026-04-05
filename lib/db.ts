import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

declare global {
  var luminaPrismaClientV2: PrismaClient | undefined;
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});

export const db = global.luminaPrismaClientV2 ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.luminaPrismaClientV2 = db;
}
