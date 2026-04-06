import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";
import { runProductImport } from "@/lib/admin/imports/pipeline";

type BrandSeed = {
  slug: string;
  website: string;
  name: string;
  summaryUk: string;
  summaryRu: string;
  summaryEn: string;
};

type Phase1JsonItem = {
  externalId: string;
  slug: string;
  sku: string;
  brandSlug: string;
  categorySlug: string;
  name: string;
  price: number;
  stock: number;
  specs: Record<string, string | number | boolean>;
  technicalAttributes?: Record<string, string>;
  specPrimaryUrl: string;
  specSecondaryUrls?: string;
  imagePrimaryUrl: string;
  imageSourceKind: string;
  imageSourcePageUrl: string;
  importBatch: string;
  /** Passed through to Product.metadata.priceMatch for price-preview matching (P0/P1). */
  priceMatch?: { primaryMpn?: string; mpns?: string[] };
  shortUk: string;
  shortRu: string;
  shortEn: string;
};

const IMPORT_SOURCE_KEY = "phase1-mini-batch-v1";

const CATEGORY_DESCRIPTIONS: Record<string, { uk: string; ru: string; en: string }> = {
  processors: {
    uk: "Нормалізована позиція для конфігуратора з акцентом на сумісність по сокету і прогнозовану продуктивність.",
    ru: "Нормализованная позиция для конфигуратора с акцентом на совместимость по сокету и прогнозируемую производительность.",
    en: "A normalized configurator-ready SKU focused on socket compatibility and predictable performance.",
  },
  motherboards: {
    uk: "Материнська плата додана так, щоб у конфігураторі коректно працювали фільтрація по сокету, типу пам'яті та форм-фактору.",
    ru: "Материнская плата добавлена так, чтобы в конфигураторе корректно работали фильтрация по сокету, типу памяти и форм-фактору.",
    en: "This motherboard is added with proper socket, memory, and form factor data so configurator checks work correctly.",
  },
  memory: {
    uk: "Комплект пам'яті з нормалізованими параметрами обсягу, типу та частоти для коректної роботи підбору в конфігураторі.",
    ru: "Комплект памяти с нормализованными параметрами объема, типа и частоты для корректной работы подбора в конфигураторе.",
    en: "A memory kit with normalized capacity, type, and speed fields for clean configurator matching.",
  },
  "graphics-cards": {
    uk: "Відеокарта з прив'язаними параметрами довжини, енергоспоживання та рекомендованого БЖ для реальної сумісності в конфігураторі.",
    ru: "Видеокарта с привязанными параметрами длины, энергопотребления и рекомендуемого БП для реальной совместимости в конфигураторе.",
    en: "A GPU with normalized length, power draw, and recommended PSU data for real configurator compatibility.",
  },
  storage: {
    uk: "Накопичувач для системи, ігор і робочих файлів із нормалізованими полями інтерфейсу та форм-фактору.",
    ru: "Накопитель для системы, игр и рабочих файлов с нормализованными полями интерфейса и форм-фактора.",
    en: "Storage for the OS, games, and projects with normalized interface and form factor attributes.",
  },
  "power-supplies": {
    uk: "Блок живлення для збірок різного класу з прив'язаною потужністю, щоб підбір у конфігураторі був передбачуваним.",
    ru: "Блок питания для сборок разного класса с привязанной мощностью, чтобы подбор в конфигураторе был предсказуемым.",
    en: "A PSU with normalized wattage so configurator sizing stays predictable across different build classes.",
  },
  cooling: {
    uk: "Охолодження з нормалізованою підтримкою сокетів і висотою там, де це критично для сумісності корпусу.",
    ru: "Охлаждение с нормализованной поддержкой сокетов и высотой там, где это критично для совместимости корпуса.",
    en: "Cooling hardware with normalized socket support and height data where fitment matters.",
  },
  cases: {
    uk: "Корпус із прив'язаними лімітами по довжині GPU, висоті кулера та підтримуваних форм-факторах.",
    ru: "Корпус с привязанными лимитами по длине GPU, высоте кулера и поддерживаемым форм-факторам.",
    en: "A case with normalized GPU length, cooler height, and supported motherboard form factors.",
  },
};

const brands: BrandSeed[] = [
  { slug: "amd", website: "https://www.amd.com", name: "AMD", summaryUk: "Процесори Ryzen та платформи для ігрових ПК.", summaryRu: "Процессоры Ryzen и платформы для игровых ПК.", summaryEn: "Ryzen processors and platforms for gaming PCs." },
  { slug: "intel", website: "https://www.intel.com", name: "Intel", summaryUk: "Процесори та платформи для ігрових і робочих ПК.", summaryRu: "Процессоры и платформы для игровых и рабочих ПК.", summaryEn: "Processors and platforms for gaming and workstation PCs." },
  { slug: "asus", website: "https://www.asus.com", name: "ASUS", summaryUk: "Материнські плати, відеокарти та компоненти.", summaryRu: "Материнские платы, видеокарты и компоненты.", summaryEn: "Motherboards, graphics cards, and PC components." },
  { slug: "gigabyte", website: "https://www.gigabyte.com", name: "Gigabyte", summaryUk: "Материнські плати та відеокарти AORUS / Gaming.", summaryRu: "Материнские платы и видеокарты AORUS / Gaming.", summaryEn: "AORUS / Gaming motherboards and graphics cards." },
  { slug: "msi", website: "https://www.msi.com", name: "MSI", summaryUk: "Материнські плати та компоненти для сучасних збірок.", summaryRu: "Материнские платы и компоненты для современных сборок.", summaryEn: "Motherboards and component hardware for modern builds." },
  { slug: "corsair", website: "https://www.corsair.com", name: "Corsair", summaryUk: "Пам'ять, БЖ та периферія для high-end збірок.", summaryRu: "Память, БП и периферия для high-end сборок.", summaryEn: "Memory, PSUs, and peripherals for high-end builds." },
  { slug: "noctua", website: "https://noctua.at", name: "Noctua", summaryUk: "Тихе преміальне повітряне охолодження.", summaryRu: "Тихое премиальное воздушное охлаждение.", summaryEn: "Premium low-noise air cooling." },
  { slug: "deepcool", website: "https://www.deepcool.com", name: "DeepCool", summaryUk: "Охолодження та компоненти для конфігураторних збірок.", summaryRu: "Охлаждение и компоненты для конфигураторных сборок.", summaryEn: "Cooling and hardware for configurator-ready builds." },
  { slug: "seasonic", website: "https://seasonic.com", name: "Seasonic", summaryUk: "Надійні блоки живлення для продуктивних ПК.", summaryRu: "Надежные блоки питания для производительных ПК.", summaryEn: "Reliable power supplies for performance PCs." },
  { slug: "be-quiet", website: "https://www.bequiet.com", name: "be quiet!", summaryUk: "Тихі блоки живлення та корпуси.", summaryRu: "Тихие блоки питания и корпуса.", summaryEn: "Quiet power supplies and cases." },
  { slug: "western-digital", website: "https://www.westerndigital.com", name: "Western Digital", summaryUk: "SSD для системи, ігор і робочих файлів.", summaryRu: "SSD для системы, игр и рабочих файлов.", summaryEn: "SSD storage for systems, games, and project files." },
  { slug: "crucial", website: "https://www.crucial.com", name: "Crucial", summaryUk: "Пам'ять і SSD для апгрейду.", summaryRu: "Память и SSD для апгрейда.", summaryEn: "Memory and SSDs for upgrades." },
  { slug: "samsung", website: "https://www.samsung.com", name: "Samsung", summaryUk: "SSD та накопичувачі для ПК і ноутбуків.", summaryRu: "SSD и накопители для ПК и ноутбуков.", summaryEn: "SSDs and storage for PCs and laptops." },
  { slug: "fractal-design", website: "https://www.fractal-design.com", name: "Fractal Design", summaryUk: "Корпуси з акцентом на повітряний потік і дизайн.", summaryRu: "Корпуса с акцентом на воздушный поток и дизайн.", summaryEn: "Cases focused on airflow and clean design." },
  { slug: "nzxt", website: "https://nzxt.com", name: "NZXT", summaryUk: "Корпуси з чистим сучасним дизайном.", summaryRu: "Корпуса с чистым современным дизайном.", summaryEn: "Cases with a clean modern design language." },
  { slug: "lian-li", website: "https://lian-li.com", name: "Lian Li", summaryUk: "Преміальні алюмінієві та dual-chamber корпуси.", summaryRu: "Премиальные алюминиевые и dual-chamber корпуса.", summaryEn: "Premium aluminum and dual-chamber PC cases." },
];

async function ensureBrands() {
  for (const brand of brands) {
    await db.brand.upsert({
      where: { slug: brand.slug },
      update: {
        website: brand.website,
        translations: {
          deleteMany: {},
          create: [{ locale: "uk", name: brand.name, summary: brand.summaryUk }],
        },
      },
      create: {
        slug: brand.slug,
        website: brand.website,
        translations: {
          create: [{ locale: "uk", name: brand.name, summary: brand.summaryUk }],
        },
      },
    });
  }
}

function loadPhase1Items(): Phase1JsonItem[] {
  const dir = join(process.cwd(), "data", "catalog-phase1");
  const names = readdirSync(dir)
    .filter((f) => f.startsWith("phase1-mini-") && f.endsWith(".json"))
    .sort();
  const items: Phase1JsonItem[] = [];
  for (const name of names) {
    const raw = readFileSync(join(dir, name), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected array in ${name}`);
    }
    for (const row of parsed) {
      items.push(row as Phase1JsonItem);
    }
  }
  return items;
}

function buildRows(items: Phase1JsonItem[]) {
  return items.map((item) => {
    const description = CATEGORY_DESCRIPTIONS[item.categorySlug] ?? CATEGORY_DESCRIPTIONS.processors;
    const secondary = String(item.specSecondaryUrls ?? "").trim();
    const metadata: Record<string, unknown> = {
      curated: true,
      phase1MiniBatch: true,
      importBatch: item.importBatch,
      specPrimaryUrl: item.specPrimaryUrl,
      imageSourceKind: item.imageSourceKind,
      imageSourcePageUrl: item.imageSourcePageUrl,
    };
    if (secondary) {
      metadata.specSecondaryUrls = secondary;
    }
    if (item.priceMatch && typeof item.priceMatch === "object") {
      metadata.priceMatch = item.priceMatch;
    }

    return {
      locale: "uk",
      externalId: item.externalId,
      importSourceKey: IMPORT_SOURCE_KEY,
      slug: item.slug,
      sku: item.sku,
      brandSlug: item.brandSlug,
      categorySlug: item.categorySlug,
      status: "PUBLISHED",
      price: item.price,
      oldPrice: null,
      currency: "UAH",
      inventoryStatus: item.stock <= 3 ? ("LOW_STOCK" as const) : ("IN_STOCK" as const),
      stock: item.stock,
      heroImage: item.imagePrimaryUrl,
      gallery: [item.imagePrimaryUrl],
      specs: item.specs,
      metadata,
      technicalAttributes: item.technicalAttributes ?? {},
      translations: [
        {
          locale: "uk",
          name: item.name,
          shortDescription: item.shortUk,
          description: description.uk,
          seoTitle: item.name,
          seoDescription: item.shortUk,
        },
      ],
    };
  });
}

async function main() {
  const items = loadPhase1Items();
  if (items.length === 0) {
    throw new Error("No items found under data/catalog-phase1/");
  }

  await ensureBrands();
  const rows = buildRows(items);

  const result = await runProductImport({
    sourceType: "UPLOAD_JSON",
    importMode: "UPSERT",
    sourceKey: IMPORT_SOURCE_KEY,
    sourceFileName: "phase1-mini-batch.json",
    dryRun: false,
    maxRows: 500,
    maxPayloadBytes: 50_000_000,
    skuFallbackEnabled: true,
    slugFallbackEnabled: true,
    rawContent: JSON.stringify(rows),
  });

  if (!result.ok) {
    throw new Error("Import failed");
  }

  console.log(JSON.stringify({ itemCount: items.length, jobId: result.jobId, preview: result.preview }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
