import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";

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
      siteMode: "PC_BUILD",
      brandName: "Lumina Tech",
      shortBrandName: "Lumina",
      logoText: "LUMINA",
      logoPath: "/brand/lumina-logo.png",
      supportEmail: "hello@luminatech.store",
      supportPhone: "+380 44 555 01 77",
      address: "Kyiv, 12 Saksahanskoho St.",
      metaTitle: "Lumina Tech — збірка ПК та комплектуючі",
      metaDescription:
        "Підбір збірки ПК, комплектуючі та периферія: конфігуратор сумісності та каталог для апгрейду.",
      faviconPath: "/favicon.ico",
      defaultCurrency: "UAH",
      defaultLocale: "uk",
      watermarkText: "LUMINA",
      heroTitle: "Збірка ПК під ваші задачі",
      heroSubtitle: "Конфігуратор сумісності, каталог комплектуючих і готові рішення в одному місці.",
      heroCtaLabel: "Конфігуратор",
      heroCtaHref: "/uk/configurator",
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
