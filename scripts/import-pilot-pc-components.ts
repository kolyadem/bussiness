/**
 * Pilot PC components import — parallel to existing catalog (no wipe).
 * Run: npm run catalog:pilot
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { runProductImport } from "@/lib/admin/imports/pipeline";
import {
  PILOT_CATALOG_ITEMS,
  PILOT_IMPORT_SOURCE_KEY,
  type PilotCatalogItem,
} from "./data/pilot-pc-components-v1";

/** Slug / externalId: contract — lowercased SKU */
export function skuToSlug(sku: string): string {
  return sku.toLowerCase();
}

const FULL_DESCRIPTIONS: Record<string, { uk: string; ru: string; en: string }> = {
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

type PilotBrandSeed = {
  slug: string;
  website: string;
  name: string;
  summaryUk: string;
  summaryRu: string;
  summaryEn: string;
};

/** All brand slugs referenced by PILOT_CATALOG_ITEMS — upsert before import */
const PILOT_BRANDS: PilotBrandSeed[] = [
  { slug: "amd", website: "https://www.amd.com", name: "AMD", summaryUk: "Процесори та графіка для ПК.", summaryRu: "Процессоры и графика для ПК.", summaryEn: "Processors and graphics for PCs." },
  { slug: "arctic", website: "https://www.arctic.de", name: "Arctic", summaryUk: "Охолодження та термоінтерфейси.", summaryRu: "Охлаждение и термоинтерфейсы.", summaryEn: "Cooling and thermal solutions." },
  { slug: "asus", website: "https://www.asus.com", name: "ASUS", summaryUk: "Материнські плати та компоненти.", summaryRu: "Материнские платы и компоненты.", summaryEn: "Motherboards and components." },
  { slug: "be-quiet", website: "https://www.bequiet.com", name: "be quiet!", summaryUk: "Блоки живлення та корпуси.", summaryRu: "Блоки питания и корпуса.", summaryEn: "Power supplies and cases." },
  { slug: "corsair", website: "https://www.corsair.com", name: "Corsair", summaryUk: "Памʼять, БЖ, охолодження, корпуси.", summaryRu: "Память, БП, охлаждение, корпуса.", summaryEn: "Memory, PSUs, cooling, cases." },
  { slug: "crucial", website: "https://www.crucial.com", name: "Crucial", summaryUk: "Памʼять та SSD.", summaryRu: "Память и SSD.", summaryEn: "Memory and SSDs." },
  { slug: "deepcool", website: "https://www.deepcool.com", name: "DeepCool", summaryUk: "Охолодження та БЖ.", summaryRu: "Охлаждение и БП.", summaryEn: "Cooling and power supplies." },
  { slug: "fractal", website: "https://www.fractal-design.com", name: "Fractal Design", summaryUk: "Корпуси преміум-класу.", summaryRu: "Корпуса премиум-класса.", summaryEn: "Premium PC cases." },
  { slug: "gigabyte", website: "https://www.gigabyte.com", name: "Gigabyte", summaryUk: "Материнські плати та компоненти.", summaryRu: "Материнские платы и компоненты.", summaryEn: "Motherboards and components." },
  { slug: "gskill", website: "https://www.gskill.com", name: "G.Skill", summaryUk: "Памʼять для ентузіастів.", summaryRu: "Память для энтузиастов.", summaryEn: "Enthusiast memory kits." },
  { slug: "intel", website: "https://www.intel.com", name: "Intel", summaryUk: "Процесори Core для настільних ПК.", summaryRu: "Процессоры Core для настольных ПК.", summaryEn: "Core desktop processors." },
  { slug: "kingston", website: "https://www.kingston.com", name: "Kingston", summaryUk: "Памʼять та SSD.", summaryRu: "Память и SSD.", summaryEn: "Memory and SSDs." },
  { slug: "lian-li", website: "https://lian-li.com", name: "Lian Li", summaryUk: "Корпуси та аксесуари.", summaryRu: "Корпуса и аксессуары.", summaryEn: "Cases and accessories." },
  { slug: "msi", website: "https://www.msi.com", name: "MSI", summaryUk: "Материнські плати та компоненти.", summaryRu: "Материнские платы и компоненты.", summaryEn: "Motherboards and components." },
  { slug: "noctua", website: "https://noctua.at", name: "Noctua", summaryUk: "Преміальне повітряне охолодження.", summaryRu: "Премиальное воздушное охлаждение.", summaryEn: "Premium air cooling." },
  { slug: "nvidia", website: "https://www.nvidia.com", name: "NVIDIA", summaryUk: "Відеокарти GeForce.", summaryRu: "Видеокарты GeForce.", summaryEn: "GeForce graphics cards." },
  { slug: "nzxt", website: "https://nzxt.com", name: "NZXT", summaryUk: "Корпуси та компоненти.", summaryRu: "Корпуса и компоненты.", summaryEn: "Cases and components." },
  { slug: "samsung", website: "https://www.samsung.com", name: "Samsung", summaryUk: "SSD та дисплеї.", summaryRu: "SSD и дисплеи.", summaryEn: "SSDs and displays." },
  { slug: "seasonic", website: "https://seasonic.com", name: "Seasonic", summaryUk: "Надійні блоки живлення.", summaryRu: "Надежные блоки питания.", summaryEn: "Reliable power supplies." },
  { slug: "western-digital", website: "https://www.westerndigital.com", name: "Western Digital", summaryUk: "SSD та HDD.", summaryRu: "SSD и HDD.", summaryEn: "SSDs and HDDs." },
];

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const IMAGE_PAGE_FETCH_MS = 15_000;

async function resolveImageFromPage(pageUrl: string): Promise<string | null> {
  const response = await fetch(pageUrl, {
    signal: AbortSignal.timeout(IMAGE_PAGE_FETCH_MS),
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; LuminaCatalogBot/1.0)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Page responded with ${response.status}`);
  }

  const html = await response.text();
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const image = decodeHtml(match?.[1] ?? "").trim();

    if (/^https?:\/\//.test(image)) {
      return image;
    }
  }

  return null;
}

async function ensurePilotBrands() {
  for (const brand of PILOT_BRANDS) {
    await db.brand.upsert({
      where: { slug: brand.slug },
      update: {
        website: brand.website,
        translations: {
          deleteMany: {},
          create: [
            { locale: "uk", name: brand.name, summary: brand.summaryUk },
            { locale: "ru", name: brand.name, summary: brand.summaryRu },
            { locale: "en", name: brand.name, summary: brand.summaryEn },
          ],
        },
      },
      create: {
        slug: brand.slug,
        website: brand.website,
        translations: {
          create: [
            { locale: "uk", name: brand.name, summary: brand.summaryUk },
            { locale: "ru", name: brand.name, summary: brand.summaryRu },
            { locale: "en", name: brand.name, summary: brand.summaryEn },
          ],
        },
      },
    });
  }
}

export type PilotImageResolution = {
  sku: string;
  /** Final hero path or remote URL before pipeline download */
  hero: string;
  /** og:image URL when resolved from imagePageUrl */
  ogImageUrl?: string;
};

export async function buildPilotImportRows(items: PilotCatalogItem[]): Promise<{
  rows: Record<string, unknown>[];
  imageReport: PilotImageResolution[];
}> {
  const rows: Record<string, unknown>[] = [];
  const imageReport: PilotImageResolution[] = [];

  for (const item of items) {
    const slug = skuToSlug(item.sku);
    const description = FULL_DESCRIPTIONS[item.categorySlug] ?? FULL_DESCRIPTIONS.processors;

    let ogImageUrl: string | null | undefined;
    let hero: string;

    if (item.imagePageUrl) {
      try {
        ogImageUrl = await resolveImageFromPage(item.imagePageUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn(`[pilot] Image page failed for ${item.sku}: ${message}`);
      }
      hero = ogImageUrl ?? item.fallbackImage;
    } else {
      hero = item.fallbackImage;
    }

    imageReport.push({
      sku: item.sku,
      hero,
      ogImageUrl: ogImageUrl ?? undefined,
    });

    const inventoryStatus = item.stock <= 3 ? "LOW_STOCK" : "IN_STOCK";
    const specs = { ...item.technicalAttributes };

    rows.push({
      locale: "uk",
      externalId: slug,
      importSourceKey: PILOT_IMPORT_SOURCE_KEY,
      slug,
      sku: item.sku,
      brandSlug: item.brandSlug,
      categorySlug: item.categorySlug,
      status: "PUBLISHED",
      price: item.price,
      oldPrice: item.oldPrice,
      currency: "USD",
      inventoryStatus,
      stock: item.stock,
      heroImage: hero,
      gallery: [hero],
      specs,
      metadata: {
        curated: true,
        pilotBatch: PILOT_IMPORT_SOURCE_KEY,
      },
      technicalAttributes: item.technicalAttributes,
      translations: [
        {
          locale: "uk",
          name: item.name,
          shortDescription: item.shortUk,
          description: description.uk,
          seoTitle: item.name,
          seoDescription: item.shortUk,
        },
        {
          locale: "ru",
          name: item.name,
          shortDescription: item.shortRu,
          description: description.ru,
          seoTitle: item.name,
          seoDescription: item.shortRu,
        },
        {
          locale: "en",
          name: item.name,
          shortDescription: item.shortEn,
          description: description.en,
          seoTitle: item.name,
          seoDescription: item.shortEn,
        },
      ],
    });
  }

  return { rows, imageReport };
}

async function main() {
  await ensurePilotBrands();
  const { rows, imageReport } = await buildPilotImportRows(PILOT_CATALOG_ITEMS);

  const svgMainSkus = PILOT_CATALOG_ITEMS.filter((i) => i.imagePageUrl === null).map((i) => i.sku);
  const withPageUrl = PILOT_CATALOG_ITEMS.filter((i) => i.imagePageUrl !== null);
  const gotOg = imageReport.filter((r) => Boolean(r.ogImageUrl));
  const usedFallbackDespitePage = withPageUrl.filter((i) => {
    const rep = imageReport.find((x) => x.sku === i.sku);
    return Boolean(rep && !rep.ogImageUrl);
  });

  console.log("[pilot] rows prepared:", rows.length);
  console.log("[pilot] SKU with deterministic SVG main (no imagePageUrl):", svgMainSkus.join(", "));
  console.log("[pilot] SKU with imagePageUrl and resolved og:image:", gotOg.map((r) => r.sku).join(", "));
  if (usedFallbackDespitePage.length > 0) {
    console.warn(
      "[pilot] SKU where og:image was missing or fetch failed (fallback SVG/local used):",
      usedFallbackDespitePage.map((i) => i.sku).join(", "),
    );
  }

  const result = await runProductImport({
    sourceType: "UPLOAD_JSON",
    importMode: "UPSERT",
    sourceKey: PILOT_IMPORT_SOURCE_KEY,
    sourceFileName: "pilot-pc-components-v1.json",
    dryRun: false,
    maxRows: 50,
    maxPayloadBytes: 50_000_000,
    skuFallbackEnabled: false,
    slugFallbackEnabled: false,
    rawContent: JSON.stringify(rows),
  });

  if (!result.ok) {
    throw new Error("Pilot import failed");
  }

  console.log(JSON.stringify({ jobId: result.jobId, preview: result.preview }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
