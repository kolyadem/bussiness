import "dotenv/config";
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

type CatalogItem = {
  externalId: string;
  slug: string;
  sku: string;
  brandSlug: string;
  categorySlug: string;
  name: string;
  price: number;
  oldPrice?: number;
  stock: number;
  specs: Record<string, string | number | boolean>;
  technicalAttributes?: Record<string, string>;
  imagePageUrl?: string | null;
  fallbackImage: string;
  shortUk: string;
  shortRu: string;
  shortEn: string;
  /** Telemart product page for admin price preview (optional) */
  priceTracking?: { telemartUrl: string };
};

const IMPORT_SOURCE_KEY = "official-expanded-configurator-catalog-v1";

const brands: BrandSeed[] = [
  { slug: "intel", website: "https://www.intel.com", name: "Intel", summaryUk: "Процесори та платформи для ігрових і робочих ПК.", summaryRu: "Процессоры и платформы для игровых и рабочих ПК.", summaryEn: "Processors and platforms for gaming and workstation PCs." },
  { slug: "nvidia", website: "https://www.nvidia.com", name: "NVIDIA", summaryUk: "Відеокарти GeForce для ігор і творчих задач.", summaryRu: "Видеокарты GeForce для игр и творческих задач.", summaryEn: "GeForce graphics cards for gaming and creator workloads." },
  { slug: "msi", website: "https://www.msi.com", name: "MSI", summaryUk: "Материнські плати та компоненти для сучасних збірок.", summaryRu: "Материнские платы и компоненты для современных сборок.", summaryEn: "Motherboards and component hardware for modern builds." },
  { slug: "gskill", website: "https://www.gskill.com", name: "G.Skill", summaryUk: "Продуктивна пам'ять для сучасних платформ.", summaryRu: "Производительная память для современных платформ.", summaryEn: "Performance memory kits for modern platforms." },
  { slug: "kingston", website: "https://www.kingston.com", name: "Kingston", summaryUk: "Пам'ять і накопичувачі для апгрейду та нових систем.", summaryRu: "Память и накопители для апгрейда и новых систем.", summaryEn: "Memory and storage for upgrades and new systems." },
  { slug: "deepcool", website: "https://www.deepcool.com", name: "DeepCool", summaryUk: "Охолодження та компоненти для конфігураторних збірок.", summaryRu: "Охлаждение и компоненты для конфигураторных сборок.", summaryEn: "Cooling and hardware for configurator-ready builds." },
  { slug: "noctua", website: "https://noctua.at", name: "Noctua", summaryUk: "Тихе преміальне повітряне охолодження.", summaryRu: "Тихое премиальное воздушное охлаждение.", summaryEn: "Premium low-noise air cooling." },
  { slug: "seasonic", website: "https://seasonic.com", name: "Seasonic", summaryUk: "Надійні блоки живлення для продуктивних ПК.", summaryRu: "Надежные блоки питания для производительных ПК.", summaryEn: "Reliable power supplies for performance PCs." },
  { slug: "western-digital", website: "https://www.westerndigital.com", name: "Western Digital", summaryUk: "SSD для системи, ігор і робочих файлів.", summaryRu: "SSD для системы, игр и рабочих файлов.", summaryEn: "SSD storage for systems, games, and project files." },
  { slug: "crucial", website: "https://www.crucial.com", name: "Crucial", summaryUk: "Пам'ять і SSD для апгрейду.", summaryRu: "Память и SSD для апгрейда.", summaryEn: "Memory and SSDs for upgrades." },
  { slug: "nzxt", website: "https://nzxt.com", name: "NZXT", summaryUk: "Корпуси з чистим сучасним дизайном.", summaryRu: "Корпуса с чистым современным дизайном.", summaryEn: "Cases with a clean modern design language." },
  { slug: "lg", website: "https://www.lg.com", name: "LG", summaryUk: "Монітори для ігор і роботи.", summaryRu: "Мониторы для игр и работы.", summaryEn: "Monitors for gaming and work." },
  { slug: "razer", website: "https://www.razer.com", name: "Razer", summaryUk: "Ігрова периферія для кіберспорту і щоденної роботи.", summaryRu: "Игровая периферия для киберспорта и повседневной работы.", summaryEn: "Gaming peripherals for esports and daily use." },
];

const fullDescriptions: Record<string, { uk: string; ru: string; en: string }> = {
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
  monitors: {
    uk: "Монітор для завершення сетапу в конфігураторі й каталозі без зміни основної архітектури storefront.",
    ru: "Монитор для завершения сетапа в конфигураторе и каталоге без изменения основной архитектуры storefront.",
    en: "A monitor that rounds out the setup in both the configurator and catalog without changing the storefront architecture.",
  },
  peripherals: {
    uk: "Периферія для доповнення конфігурації з чистою прив'язкою до додаткових слотів конфігуратора.",
    ru: "Периферия для дополнения конфигурации с чистой привязкой к дополнительным слотам конфигуратора.",
    en: "Peripheral gear tied cleanly into the configurator's extra slots without bloating the data model.",
  },
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function resolveImageFromPage(pageUrl: string) {
  const response = await fetch(pageUrl, {
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

const items: CatalogItem[] = [
  { externalId: "intel-core-i5-9400f", slug: "intel-core-i5-9400f", sku: "CPU-INT-9400F", brandSlug: "intel", categorySlug: "processors", name: "Intel Core i5-9400F", price: 119, oldPrice: 139, stock: 11, specs: { cores: 6, threads: 6, boost: "4.1 GHz", socket: "LGA1151" }, technicalAttributes: { "cpu.socket": "LGA1151", "cpu.platform": "Intel Core 9th Gen", "cpu.tdp": "65" }, imagePageUrl: null, fallbackImage: "/products/cpu.svg", shortUk: "6 ядер / 6 потоків, LGA1151, до 4.1 ГГц.", shortRu: "6 ядер / 6 потоков, LGA1151, до 4.1 ГГц.", shortEn: "6 cores / 6 threads, LGA1151, up to 4.1 GHz." },
  { externalId: "intel-core-i7-9700k", slug: "intel-core-i7-9700k", sku: "CPU-INT-9700K", brandSlug: "intel", categorySlug: "processors", name: "Intel Core i7-9700K", price: 219, oldPrice: 249, stock: 8, specs: { cores: 8, threads: 8, boost: "4.9 GHz", socket: "LGA1151" }, technicalAttributes: { "cpu.socket": "LGA1151", "cpu.platform": "Intel Core 9th Gen", "cpu.tdp": "95" }, imagePageUrl: null, fallbackImage: "/products/cpu.svg", shortUk: "8 ядер / 8 потоків, LGA1151, до 4.9 ГГц.", shortRu: "8 ядер / 8 потоков, LGA1151, до 4.9 ГГц.", shortEn: "8 cores / 8 threads, LGA1151, up to 4.9 GHz." },
  { externalId: "intel-core-i9-9900k", slug: "intel-core-i9-9900k", sku: "CPU-INT-9900K", brandSlug: "intel", categorySlug: "processors", name: "Intel Core i9-9900K", price: 299, oldPrice: 349, stock: 6, specs: { cores: 8, threads: 16, boost: "5.0 GHz", socket: "LGA1151" }, technicalAttributes: { "cpu.socket": "LGA1151", "cpu.platform": "Intel Core 9th Gen", "cpu.tdp": "95" }, imagePageUrl: null, fallbackImage: "/products/cpu.svg", shortUk: "8 ядер / 16 потоків, LGA1151, до 5.0 ГГц.", shortRu: "8 ядер / 16 потоков, LGA1151, до 5.0 ГГц.", shortEn: "8 cores / 16 threads, LGA1151, up to 5.0 GHz." },
  { externalId: "amd-ryzen-5-3600", slug: "amd-ryzen-5-3600", sku: "CPU-AMD-R53600", brandSlug: "amd", categorySlug: "processors", name: "AMD Ryzen 5 3600", price: 109, oldPrice: 129, stock: 13, specs: { cores: 6, threads: 12, boost: "4.2 GHz", socket: "AM4" }, technicalAttributes: { "cpu.socket": "AM4", "cpu.platform": "Ryzen 3000", "cpu.tdp": "65" }, imagePageUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/3000-series/amd-ryzen-5-3600.html", fallbackImage: "/products/cpu.svg", shortUk: "6 ядер / 12 потоків, AM4, до 4.2 ГГц.", shortRu: "6 ядер / 12 потоков, AM4, до 4.2 ГГц.", shortEn: "6 cores / 12 threads, AM4, up to 4.2 GHz." },
  { externalId: "amd-ryzen-5-5600", slug: "amd-ryzen-5-5600", sku: "CPU-AMD-R55600", brandSlug: "amd", categorySlug: "processors", name: "AMD Ryzen 5 5600", price: 129, oldPrice: 149, stock: 12, specs: { cores: 6, threads: 12, boost: "4.4 GHz", socket: "AM4" }, technicalAttributes: { "cpu.socket": "AM4", "cpu.platform": "Ryzen 5000", "cpu.tdp": "65" }, imagePageUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-5-5600.html", fallbackImage: "/products/cpu.svg", shortUk: "6 ядер / 12 потоків, AM4, до 4.4 ГГц.", shortRu: "6 ядер / 12 потоков, AM4, до 4.4 ГГц.", shortEn: "6 cores / 12 threads, AM4, up to 4.4 GHz." },
  { externalId: "amd-ryzen-7-5700x", slug: "amd-ryzen-7-5700x", sku: "CPU-AMD-R75700X", brandSlug: "amd", categorySlug: "processors", name: "AMD Ryzen 7 5700X", price: 179, oldPrice: 199, stock: 9, specs: { cores: 8, threads: 16, boost: "4.6 GHz", socket: "AM4" }, technicalAttributes: { "cpu.socket": "AM4", "cpu.platform": "Ryzen 5000", "cpu.tdp": "65" }, imagePageUrl: "https://www.amd.com/en/products/processors/desktops/ryzen/5000-series/amd-ryzen-7-5700x.html", fallbackImage: "/products/cpu.svg", shortUk: "8 ядер / 16 потоків, AM4, до 4.6 ГГц.", shortRu: "8 ядер / 16 потоков, AM4, до 4.6 ГГц.", shortEn: "8 cores / 16 threads, AM4, up to 4.6 GHz." },
  { externalId: "asus-prime-z390-p", slug: "asus-prime-z390-p", sku: "MB-ASUS-Z390P", brandSlug: "asus", categorySlug: "motherboards", name: "ASUS Prime Z390-P", price: 139, oldPrice: 159, stock: 8, specs: { chipset: "Z390", memory: "DDR4", formFactor: "ATX" }, technicalAttributes: { "motherboard.socket": "LGA1151", "motherboard.chipset": "Z390", "motherboard.memory_type": "DDR4", "motherboard.form_factor": "ATX" }, imagePageUrl: "https://www.asus.com/motherboards-components/motherboards/prime/prime-z390-p/", fallbackImage: "/products/motherboard.svg", shortUk: "LGA1151, Z390, DDR4, ATX.", shortRu: "LGA1151, Z390, DDR4, ATX.", shortEn: "LGA1151, Z390, DDR4, ATX." },
  { externalId: "msi-b450-tomahawk-max", slug: "msi-b450-tomahawk-max", sku: "MB-MSI-B450TM", brandSlug: "msi", categorySlug: "motherboards", name: "MSI B450 Tomahawk Max", price: 119, oldPrice: 139, stock: 10, specs: { chipset: "B450", memory: "DDR4", formFactor: "ATX" }, technicalAttributes: { "motherboard.socket": "AM4", "motherboard.chipset": "B450", "motherboard.memory_type": "DDR4", "motherboard.form_factor": "ATX" }, imagePageUrl: "https://www.msi.com/Motherboard/B450-TOMAHAWK-MAX", fallbackImage: "/products/motherboard.svg", shortUk: "AM4, B450, DDR4, ATX.", shortRu: "AM4, B450, DDR4, ATX.", shortEn: "AM4, B450, DDR4, ATX." },
  { externalId: "msi-pro-b650-s-wifi", slug: "msi-pro-b650-s-wifi", sku: "MB-MSI-B650SW", brandSlug: "msi", categorySlug: "motherboards", name: "MSI PRO B650-S WiFi", price: 189, oldPrice: 209, stock: 9, specs: { chipset: "B650", memory: "DDR5", formFactor: "ATX" }, technicalAttributes: { "motherboard.socket": "AM5", "motherboard.chipset": "B650", "motherboard.memory_type": "DDR5", "motherboard.form_factor": "ATX" }, imagePageUrl: "https://www.msi.com/Motherboard/PRO-B650-S-WIFI", fallbackImage: "/products/motherboard.svg", shortUk: "AM5, B650, DDR5, ATX.", shortRu: "AM5, B650, DDR5, ATX.", shortEn: "AM5, B650, DDR5, ATX." },
  { externalId: "gskill-ripjaws-v-32gb-ddr4-3600", slug: "gskill-ripjaws-v-32gb-ddr4-3600", sku: "RAM-GSK-RV32-3600", brandSlug: "gskill", categorySlug: "memory", name: "G.Skill Ripjaws V 32GB DDR4-3600", price: 79, oldPrice: 89, stock: 14, specs: { capacity: "32 GB", layout: "2x16 GB", speed: "3600 MHz" }, technicalAttributes: { "ram.memory_type": "DDR4", "ram.capacity_gb": "32", "ram.speed_mhz": "3600" }, imagePageUrl: "https://www.gskill.com/product/165/184/1536111590/F4-3600C18D-32GVK", fallbackImage: "/products/ram.svg", shortUk: "DDR4, 2x16 ГБ, 3600 МГц.", shortRu: "DDR4, 2x16 ГБ, 3600 МГц.", shortEn: "DDR4, 2x16 GB, 3600 MHz." },
  { externalId: "kingston-fury-beast-32gb-ddr5-6000", slug: "kingston-fury-beast-32gb-ddr5-6000", sku: "RAM-KNG-B32-6000", brandSlug: "kingston", categorySlug: "memory", name: "Kingston FURY Beast 32GB DDR5-6000", price: 115, oldPrice: 129, stock: 17, specs: { capacity: "32 GB", layout: "2x16 GB", speed: "6000 MHz" }, technicalAttributes: { "ram.memory_type": "DDR5", "ram.capacity_gb": "32", "ram.speed_mhz": "6000" }, imagePageUrl: "https://www.kingston.com/en/memory/gaming/kingston-fury-beast-ddr5-memory", fallbackImage: "/products/ram.svg", shortUk: "DDR5, 2x16 ГБ, 6000 МГц.", shortRu: "DDR5, 2x16 ГБ, 6000 МГц.", shortEn: "DDR5, 2x16 GB, 6000 MHz." },
  { externalId: "nvidia-geforce-rtx-3060", slug: "nvidia-geforce-rtx-3060", sku: "GPU-NV-RTX3060", brandSlug: "nvidia", categorySlug: "graphics-cards", name: "NVIDIA GeForce RTX 3060", price: 289, oldPrice: 329, stock: 10, specs: { vram: "12 GB GDDR6", length: "242 mm", power: "170 W" }, technicalAttributes: { "gpu.length_mm": "242", "gpu.power_draw_w": "170", "gpu.recommended_psu_w": "550" }, imagePageUrl: "https://www.nvidia.com/en-us/geforce/graphics-cards/30-series/rtx-3060-3060ti/", fallbackImage: "/products/gpu.svg", shortUk: "12 ГБ GDDR6, 170 Вт, довжина 242 мм.", shortRu: "12 ГБ GDDR6, 170 Вт, длина 242 мм.", shortEn: "12 GB GDDR6, 170 W, 242 mm length." },
  { externalId: "nvidia-geforce-rtx-4070-super", slug: "nvidia-geforce-rtx-4070-super", sku: "GPU-NV-RTX4070S", brandSlug: "nvidia", categorySlug: "graphics-cards", name: "NVIDIA GeForce RTX 4070 SUPER", price: 599, oldPrice: 649, stock: 7, specs: { vram: "12 GB GDDR6X", length: "267 mm", power: "220 W" }, technicalAttributes: { "gpu.length_mm": "267", "gpu.power_draw_w": "220", "gpu.recommended_psu_w": "650" }, imagePageUrl: "https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4070-family/", fallbackImage: "/products/gpu.svg", shortUk: "12 ГБ GDDR6X, 220 Вт, довжина 267 мм.", shortRu: "12 ГБ GDDR6X, 220 Вт, длина 267 мм.", shortEn: "12 GB GDDR6X, 220 W, 267 mm length." },
  { externalId: "wd-black-sn770-1tb", slug: "wd-black-sn770-1tb", sku: "SSD-WD-SN7701TB", brandSlug: "western-digital", categorySlug: "storage", name: "WD_BLACK SN770 1TB", price: 74, oldPrice: 84, stock: 18, specs: { capacity: "1 TB", interface: "PCIe 4.0 NVMe", formFactor: "M.2 2280" }, technicalAttributes: { "storage.interface": "PCIe 4.0 NVMe", "storage.form_factor": "M.2 2280" }, imagePageUrl: "https://www.westerndigital.com/products/internal-drives/wd-black-sn770-nvme-ssd", fallbackImage: "/products/storage.svg", shortUk: "1 ТБ, PCIe 4.0 NVMe, M.2 2280.", shortRu: "1 ТБ, PCIe 4.0 NVMe, M.2 2280.", shortEn: "1 TB, PCIe 4.0 NVMe, M.2 2280." },
  { externalId: "seasonic-focus-gx-850", slug: "seasonic-focus-gx-850", sku: "PSU-SEA-FGX850", brandSlug: "seasonic", categorySlug: "power-supplies", name: "Seasonic Focus GX-850", price: 149, oldPrice: 159, stock: 9, specs: { wattage: "850 W", efficiency: "80 PLUS Gold" }, technicalAttributes: { "psu.wattage": "850" }, imagePageUrl: "https://seasonic.com/focus-gx/", fallbackImage: "/products/psu.svg", shortUk: "850 Вт, 80 PLUS Gold.", shortRu: "850 Вт, 80 PLUS Gold.", shortEn: "850 W, 80 PLUS Gold." },
  {
    externalId: "deepcool-ak620",
    slug: "deepcool-ak620",
    sku: "COL-DPC-AK620",
    brandSlug: "deepcool",
    categorySlug: "cooling",
    name: "DeepCool AK620",
    price: 59,
    oldPrice: 69,
    stock: 14,
    specs: { type: "Dual Tower Air Cooler", sockets: "AM4, AM5, LGA1700" },
    technicalAttributes: {
      "cooler.supported_sockets": "AM4, AM5, LGA1700, LGA1200, LGA1151",
      "cooler.height_mm": "160",
    },
    imagePageUrl:
      "https://www.deepcool.com/products/Cooling/cpuaircoolers/AK620-ZERO-DARK-High-Performance-CPU-Cooler-1700-AM5/2022/16040.shtml",
    fallbackImage: "/products/cooler.svg",
    shortUk: "Подвійна башта, підтримка AM4/AM5/LGA1700, 160 мм.",
    shortRu: "Двойная башня, поддержка AM4/AM5/LGA1700, 160 мм.",
    shortEn: "Dual tower, AM4/AM5/LGA1700 support, 160 mm.",
    priceTracking: { telemartUrl: "https://telemart.ua/ua/products/deepcool-ak620/" },
  },
  { externalId: "noctua-nh-d15", slug: "noctua-nh-d15", sku: "COL-NOC-NHD15", brandSlug: "noctua", categorySlug: "cooling", name: "Noctua NH-D15", price: 109, oldPrice: 119, stock: 9, specs: { type: "Dual Tower Air Cooler", sockets: "AM4, AM5, LGA1700" }, technicalAttributes: { "cooler.supported_sockets": "AM4, AM5, LGA1700, LGA1200, LGA1151", "cooler.height_mm": "165" }, imagePageUrl: "https://noctua.at/en/nh-d15", fallbackImage: "/products/cooler.svg", shortUk: "Преміальне повітряне охолодження, 165 мм.", shortRu: "Премиальное воздушное охлаждение, 165 мм.", shortEn: "Premium air cooling, 165 mm height." },
  {
    externalId: "nzxt-h5-flow",
    slug: "nzxt-h5-flow",
    sku: "CASE-NZX-H5FLOW",
    brandSlug: "nzxt",
    categorySlug: "cases",
    name: "NZXT H5 Flow",
    price: 94,
    oldPrice: 109,
    stock: 11,
    specs: { formFactors: "ATX, Micro-ATX, Mini-ITX", gpuLimit: "365 mm" },
    technicalAttributes: {
      "case.supported_form_factors": "ATX, Micro-ATX, Mini-ITX",
      "case.max_gpu_length_mm": "365",
      "case.max_cooler_height_mm": "165",
    },
    imagePageUrl: "https://nzxt.com/product/h5-flow",
    fallbackImage: "/products/case.svg",
    shortUk: "ATX / mATX / Mini-ITX, GPU до 365 мм.",
    shortRu: "ATX / mATX / Mini-ITX, GPU до 365 мм.",
    shortEn: "ATX / mATX / Mini-ITX, GPU up to 365 mm.",
    priceTracking: { telemartUrl: "https://telemart.ua/ua/products/nzxt-h5-flow-bez-bp-cc-h52fb-01-black/" },
  },
  { externalId: "lg-ultragear-27gn800-b", slug: "lg-ultragear-27gn800-b", sku: "MON-LG-27GN800B", brandSlug: "lg", categorySlug: "monitors", name: "LG UltraGear 27GN800-B", price: 229, oldPrice: 249, stock: 8, specs: { size: "27 in", resolution: "2560x1440", refreshRate: "144 Hz", panel: "IPS" }, imagePageUrl: "https://www.lg.com/us/monitors/lg-27gn800-b-gaming-monitor", fallbackImage: "/products/monitor.svg", shortUk: "27 дюймів, QHD, IPS, 144 Гц.", shortRu: "27 дюймов, QHD, IPS, 144 Гц.", shortEn: "27-inch, QHD, IPS, 144 Hz." },
  { externalId: "razer-deathadder-v3-pro", slug: "razer-deathadder-v3-pro", sku: "MOU-RAZ-DAV3PRO", brandSlug: "razer", categorySlug: "peripherals", name: "Razer DeathAdder V3 Pro", price: 149, oldPrice: 169, stock: 9, specs: { type: "Mouse", weight: "63 g", connection: "Wireless" }, imagePageUrl: "https://www.razer.com/gaming-mice/razer-deathadder-v3-pro", fallbackImage: "/products/mouse.svg", shortUk: "Бездротова миша, 63 г, Focus Pro 30K.", shortRu: "Беспроводная мышь, 63 г, Focus Pro 30K.", shortEn: "Wireless mouse, 63 g, Focus Pro 30K." },
];

async function buildRows() {
  const rows = [];

  for (const item of items) {
    let heroImage: string | null = null;

    if (item.imagePageUrl) {
      try {
        heroImage = await resolveImageFromPage(item.imagePageUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn(`Image page failed for ${item.name}: ${message}`);
      }
    }

    const description = fullDescriptions[item.categorySlug] ?? fullDescriptions.processors;
    rows.push({
      locale: "uk",
      externalId: item.externalId,
      importSourceKey: IMPORT_SOURCE_KEY,
      slug: item.slug,
      sku: item.sku,
      brandSlug: item.brandSlug,
      categorySlug: item.categorySlug,
      status: "PUBLISHED",
      price: item.price,
      oldPrice: item.oldPrice ?? null,
      currency: "UAH",
      inventoryStatus: item.stock <= 3 ? "LOW_STOCK" : "IN_STOCK",
      stock: item.stock,
      heroImage: heroImage ?? item.fallbackImage,
      gallery: [heroImage ?? item.fallbackImage],
      specs: item.specs,
      metadata: {
        curated: true,
        officialCatalogBatch: "v1",
        ...(item.priceTracking ? { priceTracking: item.priceTracking } : {}),
      },
      technicalAttributes: item.technicalAttributes ?? {},
      translations: [
        { locale: "uk", name: item.name, shortDescription: item.shortUk, description: description.uk, seoTitle: item.name, seoDescription: item.shortUk },
      ],
    });
  }

  return rows;
}

async function main() {
  await ensureBrands();
  const rows = await buildRows();
  const result = await runProductImport({
    sourceType: "UPLOAD_JSON",
    importMode: "UPSERT",
    sourceKey: IMPORT_SOURCE_KEY,
    sourceFileName: "expanded-configurator-catalog.json",
    dryRun: false,
    maxRows: 250,
    maxPayloadBytes: 50_000_000,
    skuFallbackEnabled: true,
    slugFallbackEnabled: true,
    rawContent: JSON.stringify(rows),
  });

  if (!result.ok) {
    throw new Error(result.error ?? "Import failed");
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
