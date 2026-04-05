/**
 * Minimal bootstrap: ensure the 8 pilot catalog categories exist with translations.
 * Data mirrors prisma/seed-storefront.ts (same slug, image, uk/ru/en name + description).
 * Does not delete other categories or run full seed.
 *
 * Run: npm run catalog:bootstrap-pilot-categories
 */
import "dotenv/config";
import { db } from "@/lib/db";

const locales = ["uk", "ru", "en"] as const;

/**
 * Mirror of the corresponding entries in prisma/seed-storefront.ts `categories` array.
 * sortOrder matches seed index in the full category list for consistency.
 */
const PILOT_CATEGORY_SEEDS: Array<{
  slug: string;
  image: string;
  sortOrder: number;
  translations: Record<(typeof locales)[number], { name: string; description: string }>;
}> = [
  {
    slug: "processors",
    image: "/products/cpu.svg",
    sortOrder: 1,
    translations: {
      uk: { name: "Процесори", description: "Сучасні CPU для ігор та роботи." },
      ru: { name: "Процессоры", description: "Современные CPU для игр и работы." },
      en: { name: "Processors", description: "Modern CPUs for gaming and work." },
    },
  },
  {
    slug: "motherboards",
    image: "/products/motherboard.svg",
    sortOrder: 2,
    translations: {
      uk: { name: "Материнські плати", description: "Основа збалансованої збірки." },
      ru: { name: "Материнские платы", description: "Основа сбалансированной сборки." },
      en: { name: "Motherboards", description: "The core of a balanced build." },
    },
  },
  {
    slug: "memory",
    image: "/products/ram.svg",
    sortOrder: 3,
    translations: {
      uk: { name: "Оперативна памʼять", description: "Швидкі DDR5-комплекти." },
      ru: { name: "Оперативная память", description: "Быстрые DDR5-комплекты." },
      en: { name: "Memory", description: "Fast DDR5 kits." },
    },
  },
  {
    slug: "graphics-cards",
    image: "/products/gpu.svg",
    sortOrder: 4,
    translations: {
      uk: { name: "Відеокарти", description: "GPU для AAA-ігор і creator-задач." },
      ru: { name: "Видеокарты", description: "GPU для AAA-игр и creator-задач." },
      en: { name: "Graphics cards", description: "GPUs for AAA gaming and creator workloads." },
    },
  },
  {
    slug: "storage",
    image: "/products/storage.svg",
    sortOrder: 5,
    translations: {
      uk: { name: "SSD / HDD", description: "Накопичувачі для системи та бібліотеки." },
      ru: { name: "SSD / HDD", description: "Накопители для системы и библиотеки." },
      en: { name: "SSD / HDD", description: "Storage for OS and game libraries." },
    },
  },
  {
    slug: "power-supplies",
    image: "/products/psu.svg",
    sortOrder: 6,
    translations: {
      uk: { name: "Блоки живлення", description: "Надійне живлення із запасом по потужності." },
      ru: { name: "Блоки питания", description: "Надежное питание с запасом по мощности." },
      en: { name: "Power supplies", description: "Stable power delivery with room to grow." },
    },
  },
  {
    slug: "cooling",
    image: "/products/cooler.svg",
    sortOrder: 7,
    translations: {
      uk: { name: "Охолодження", description: "Кулери для тихої та стабільної роботи системи." },
      ru: { name: "Охлаждение", description: "Кулеры для тихой и стабильной работы системы." },
      en: { name: "Cooling", description: "Cooling solutions for quiet, stable builds." },
    },
  },
  {
    slug: "cases",
    image: "/products/case.svg",
    sortOrder: 8,
    translations: {
      uk: { name: "Корпуси", description: "Корпуси з підтримкою сучасних high-end компонентів." },
      ru: { name: "Корпуса", description: "Корпуса с поддержкой современных high-end компонентов." },
      en: { name: "Cases", description: "Cases built for modern premium components." },
    },
  },
];

async function main() {
  for (const cat of PILOT_CATEGORY_SEEDS) {
    const row = await db.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        image: cat.image,
        sortOrder: cat.sortOrder,
      },
      update: {
        image: cat.image,
        sortOrder: cat.sortOrder,
      },
    });

    for (const locale of locales) {
      const t = cat.translations[locale];
      await db.categoryTranslation.upsert({
        where: {
          categoryId_locale: {
            categoryId: row.id,
            locale,
          },
        },
        create: {
          categoryId: row.id,
          locale,
          name: t.name,
          description: t.description,
        },
        update: {
          name: t.name,
          description: t.description,
        },
      });
    }

    console.log(`[bootstrap-pilot-categories] upserted: ${cat.slug}`);
  }

  console.log(`[bootstrap-pilot-categories] done (${PILOT_CATEGORY_SEEDS.length} categories).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
