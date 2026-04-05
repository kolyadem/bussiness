import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db"
});

const db = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash("Admin12345!", 10);

  await db.siteSettings.deleteMany();
  await db.user.deleteMany();

  await db.user.create({
    data: {
      login: "store-admin",
      name: "Store Admin",
      email: "admin@luminatech.store",
      passwordHash,
      role: "ADMIN",
      locale: "uk"
    }
  });

  await db.siteSettings.create({
    data: {
      brandName: "Lumina Tech",
      shortBrandName: "Lumina",
      logoText: "LUMINA",
      logoPath: "/brand/lumina-logo.png",
      supportEmail: "hello@luminatech.store",
      supportPhone: "+380 44 555 01 77",
      address: "Kyiv, 12 Saksahanskoho St.",
      metaTitle: "Lumina Tech premium electronics store",
      metaDescription: "Premium online store for PCs, components, laptops and gaming gear with smart compatibility.",
      faviconPath: "/favicon.ico",
      defaultCurrency: "USD",
      defaultLocale: "uk",
      watermarkText: "LUMINA",
      heroTitle: "Преміальна техніка без випадкових компромісів",
      heroSubtitle: "Фундамент інтернет-магазину готовий: Next.js, Prisma, база і seed-дані.",
      heroCtaLabel: "Каталог",
      heroCtaHref: "/uk/catalog",
      featuredCategorySlugs: "[]",
      featuredProductIds: "[]"
      }
    });

  console.log("Seed completed");
  console.log("Admin: admin@luminatech.store / Admin12345!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
