/**
 * Additive product seed — does NOT delete existing data.
 * Run: npx tsx prisma/seed-products.ts
 *
 * Adds ~160 real PC component and peripheral products to existing categories.
 * Price is set to 0 (placeholder) — to be filled manually via admin.
 * No images — heroImage uses category SVG placeholders.
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { buildTechnicalScalarFields } from "@/lib/configurator/technical-attributes";

const PLACEHOLDER_PRICE = 0;

type ProductDef = {
  slug: string;
  sku: string;
  brandSlug: string;
  categorySlug: string;
  heroImage: string;
  specs: Record<string, string>;
  technicalAttributes?: Record<string, string>;
  translations: {
    uk: { name: string; shortDescription: string; description: string };
  };
};

// ── Brands to ensure exist ────────────────────────────────────────────

const brandsToEnsure = [
  { slug: "intel", website: "https://www.intel.com", name: "Intel", summary: "Процесори та платформи." },
  { slug: "amd", website: "https://www.amd.com", name: "AMD", summary: "Процесори та платформи для ігор і роботи." },
  { slug: "nvidia", website: "https://www.nvidia.com", name: "NVIDIA", summary: "Відеокарти GeForce для ігор та роботи." },
  { slug: "corsair", website: "https://www.corsair.com", name: "Corsair", summary: "Памʼять, корпуси, охолодження та блоки живлення." },
  { slug: "kingston", website: "https://www.kingston.com", name: "Kingston", summary: "Оперативна памʼять та SSD-накопичувачі." },
  { slug: "gskill", website: "https://www.gskill.com", name: "G.Skill", summary: "Високопродуктивна оперативна памʼять." },
  { slug: "samsung", website: "https://www.samsung.com", name: "Samsung", summary: "SSD-накопичувачі та дисплеї." },
  { slug: "wd", website: "https://www.westerndigital.com", name: "Western Digital", summary: "Жорсткі диски та SSD." },
  { slug: "seagate", website: "https://www.seagate.com", name: "Seagate", summary: "Жорсткі диски для зберігання даних." },
  { slug: "asus", website: "https://www.asus.com", name: "ASUS", summary: "Материнські плати, відеокарти, ноутбуки та монітори." },
  { slug: "msi", website: "https://www.msi.com", name: "MSI", summary: "Материнські плати, відеокарти та ноутбуки." },
  { slug: "gigabyte", website: "https://www.gigabyte.com", name: "Gigabyte", summary: "Материнські плати та відеокарти." },
  { slug: "deepcool", website: "https://www.deepcool.com", name: "Deepcool", summary: "Охолодження та блоки живлення." },
  { slug: "chieftec", website: "https://www.chieftec.eu", name: "Chieftec", summary: "Блоки живлення та корпуси." },
  { slug: "bequiet", website: "https://www.bequiet.com", name: "be quiet!", summary: "Тихі блоки живлення та охолодження." },
  { slug: "id-cooling", website: "https://www.idcooling.com", name: "ID-Cooling", summary: "Доступне та ефективне охолодження." },
  { slug: "aula", website: null, name: "AULA", summary: "Ігрова периферія." },
  { slug: "razer", website: "https://www.razer.com", name: "Razer", summary: "Преміальна ігрова периферія." },
  { slug: "hyperx", website: "https://www.hyperx.com", name: "HyperX", summary: "Ігрова периферія та аксесуари." },
  { slug: "logitech", website: "https://www.logitech.com", name: "Logitech", summary: "Преміальна периферія для продуктивності та ігор." },
  { slug: "fifine", website: "https://fifinemicrophone.com", name: "Fifine", summary: "USB-мікрофони для стриму та контенту." },
  { slug: "maono", website: "https://www.maono.com", name: "Maono", summary: "Доступні мікрофони для стримів." },
];

// ── Product definitions ───────────────────────────────────────────────

const products: ProductDef[] = [
  // ─── CPU Intel i3 ───
  ...[
    { model: "i3-9100F", socket: "LGA1151", cores: "4", threads: "4" },
    { model: "i3-10100F", socket: "LGA1200", cores: "4", threads: "8" },
    { model: "i3-12100F", socket: "LGA1700", cores: "4", threads: "8" },
    { model: "i3-13100F", socket: "LGA1700", cores: "4", threads: "8" },
  ].map((c) => cpu("intel", c.model, c.socket, c.cores, c.threads)),

  // ─── CPU Intel i5 ───
  ...[
    { model: "i5-9400F", socket: "LGA1151", cores: "6", threads: "6" },
    { model: "i5-10400F", socket: "LGA1200", cores: "6", threads: "12" },
    { model: "i5-11400F", socket: "LGA1200", cores: "6", threads: "12" },
    { model: "i5-12400F", socket: "LGA1700", cores: "6", threads: "12" },
    { model: "i5-13400F", socket: "LGA1700", cores: "10", threads: "16" },
    { model: "i5-14400F", socket: "LGA1700", cores: "10", threads: "16" },
  ].map((c) => cpu("intel", c.model, c.socket, c.cores, c.threads)),

  // ─── CPU Intel i7 ───
  ...[
    { model: "i7-9700F", socket: "LGA1151", cores: "8", threads: "8" },
    { model: "i7-10700F", socket: "LGA1200", cores: "8", threads: "16" },
    { model: "i7-11700F", socket: "LGA1200", cores: "8", threads: "16" },
    { model: "i7-12700F", socket: "LGA1700", cores: "12", threads: "20" },
    { model: "i7-13700F", socket: "LGA1700", cores: "16", threads: "24" },
    { model: "i7-14700F", socket: "LGA1700", cores: "20", threads: "28" },
  ].map((c) => cpu("intel", c.model, c.socket, c.cores, c.threads)),

  // ─── CPU Intel i9 ───
  ...[
    { model: "i9-9900K", socket: "LGA1151", cores: "8", threads: "16" },
    { model: "i9-10900K", socket: "LGA1200", cores: "10", threads: "20" },
    { model: "i9-11900K", socket: "LGA1200", cores: "8", threads: "16" },
    { model: "i9-12900K", socket: "LGA1700", cores: "16", threads: "24" },
    { model: "i9-13900K", socket: "LGA1700", cores: "24", threads: "32" },
    { model: "i9-14900K", socket: "LGA1700", cores: "24", threads: "32" },
  ].map((c) => cpu("intel", c.model, c.socket, c.cores, c.threads)),

  // ─── Intel Core Ultra ───
  cpu("intel", "Core Ultra 5 245K", "LGA1851", "14", "14"),
  cpu("intel", "Core Ultra 7 265K", "LGA1851", "20", "20"),
  cpu("intel", "Core Ultra 9 285K", "LGA1851", "24", "24"),

  // ─── CPU AMD Ryzen 5 ───
  ...[
    { model: "Ryzen 5 1600", socket: "AM4", cores: "6", threads: "12" },
    { model: "Ryzen 5 2600", socket: "AM4", cores: "6", threads: "12" },
    { model: "Ryzen 5 3600", socket: "AM4", cores: "6", threads: "12" },
    { model: "Ryzen 5 5600", socket: "AM4", cores: "6", threads: "12" },
    { model: "Ryzen 5 7600", socket: "AM5", cores: "6", threads: "12" },
    { model: "Ryzen 5 8600G", socket: "AM5", cores: "6", threads: "12" },
    { model: "Ryzen 5 9600X", socket: "AM5", cores: "6", threads: "12" },
  ].map((c) => cpu("amd", c.model, c.socket, c.cores, c.threads)),

  // ─── CPU AMD Ryzen 7 ───
  ...[
    { model: "Ryzen 7 1700", socket: "AM4", cores: "8", threads: "16" },
    { model: "Ryzen 7 2700", socket: "AM4", cores: "8", threads: "16" },
    { model: "Ryzen 7 3700X", socket: "AM4", cores: "8", threads: "16" },
    { model: "Ryzen 7 5800X", socket: "AM4", cores: "8", threads: "16" },
    { model: "Ryzen 7 7700", socket: "AM5", cores: "8", threads: "16" },
    { model: "Ryzen 7 8700G", socket: "AM5", cores: "8", threads: "16" },
    { model: "Ryzen 7 9700X", socket: "AM5", cores: "8", threads: "16" },
  ].map((c) => cpu("amd", c.model, c.socket, c.cores, c.threads)),

  // ─── CPU AMD Ryzen 9 ───
  ...[
    { model: "Ryzen 9 3900X", socket: "AM4", cores: "12", threads: "24" },
    { model: "Ryzen 9 5900X", socket: "AM4", cores: "12", threads: "24" },
    { model: "Ryzen 9 5950X", socket: "AM4", cores: "16", threads: "32" },
    { model: "Ryzen 9 7900X", socket: "AM5", cores: "12", threads: "24" },
    { model: "Ryzen 9 7950X", socket: "AM5", cores: "16", threads: "32" },
    { model: "Ryzen 9 9900X", socket: "AM5", cores: "12", threads: "24" },
    { model: "Ryzen 9 9950X", socket: "AM5", cores: "16", threads: "32" },
  ].map((c) => cpu("amd", c.model, c.socket, c.cores, c.threads)),

  // ─── GPU NVIDIA GTX ───
  ...["GTX 1630", "GTX 1650", "GTX 1660"].map((m) => gpu(m)),
  // ─── GPU NVIDIA RTX 20 ───
  ...["RTX 2060", "RTX 2070", "RTX 2080"].map((m) => gpu(m)),
  // ─── GPU NVIDIA RTX 30 ───
  ...["RTX 3050", "RTX 3060", "RTX 3070", "RTX 3080", "RTX 3090"].map((m) => gpu(m)),
  // ─── GPU NVIDIA RTX 40 ───
  ...["RTX 4060", "RTX 4070", "RTX 4080", "RTX 4090"].map((m) => gpu(m)),

  // ─── RAM ───
  ...ramVariants(),

  // ─── SSD ───
  ssd("samsung", "Samsung 970 EVO Plus 500GB", "500 GB", "PCIe 3.0 NVMe", "M.2 2280"),
  ssd("samsung", "Samsung 980 PRO 1TB", "1 TB", "PCIe 4.0 NVMe", "M.2 2280"),
  ssd("wd", "WD Black SN770 500GB", "500 GB", "PCIe 4.0 NVMe", "M.2 2280"),
  ssd("wd", "WD Black SN770 1TB", "1 TB", "PCIe 4.0 NVMe", "M.2 2280"),
  ssd("kingston", "Kingston NV2 500GB", "500 GB", "PCIe 4.0 NVMe", "M.2 2280"),
  ssd("kingston", "Kingston NV2 1TB", "1 TB", "PCIe 4.0 NVMe", "M.2 2280"),

  // ─── HDD ───
  hdd("wd", "WD Blue 1TB", "1 TB"),
  hdd("wd", "WD Blue 2TB", "2 TB"),
  hdd("seagate", "Seagate Barracuda 1TB", "1 TB"),
  hdd("seagate", "Seagate Barracuda 2TB", "2 TB"),


  // ─── Motherboards ───
  mb("asus", "ASUS Prime B660M-A", "B660", "LGA1700", "DDR4", "Micro-ATX"),
  mb("msi", "MSI PRO B660M-A", "B660", "LGA1700", "DDR4", "Micro-ATX"),
  mb("gigabyte", "Gigabyte B660M DS3H", "B660", "LGA1700", "DDR4", "Micro-ATX"),
  mb("asus", "ASUS Prime B760M-A", "B760", "LGA1700", "DDR5", "Micro-ATX"),
  mb("msi", "MSI MAG B760 Tomahawk WiFi", "B760", "LGA1700", "DDR5", "ATX"),
  mb("gigabyte", "Gigabyte B760 AORUS Elite AX", "B760", "LGA1700", "DDR5", "ATX"),
  mb("asus", "ASUS TUF Gaming B550M-Plus", "B550", "AM4", "DDR4", "Micro-ATX"),
  mb("msi", "MSI MAG B550 Tomahawk", "B550", "AM4", "DDR4", "ATX"),
  mb("gigabyte", "Gigabyte B550 AORUS Elite V2", "B550", "AM4", "DDR4", "ATX"),
  mb("asus", "ASUS TUF Gaming B650-Plus WiFi", "B650", "AM5", "DDR5", "ATX"),
  mb("msi", "MSI MAG B650 Tomahawk WiFi", "B650", "AM5", "DDR5", "ATX"),
  mb("gigabyte", "Gigabyte B650 AORUS Elite AX", "B650", "AM5", "DDR5", "ATX"),

  // ─── PSU ───
  psu("deepcool", "Deepcool PF500", "500"),
  psu("deepcool", "Deepcool PF600", "600"),
  psu("deepcool", "Deepcool PF700", "700"),
  psu("chieftec", "Chieftec Proton 500W", "500"),
  psu("chieftec", "Chieftec Proton 600W", "600"),
  psu("chieftec", "Chieftec Proton 700W", "700"),
  psu("bequiet", "be quiet! System Power 10 550W", "550"),
  psu("bequiet", "be quiet! Pure Power 12 M 650W", "650"),
  psu("bequiet", "be quiet! Pure Power 12 M 750W", "750"),

  // ─── Cooling ───
  cooler("id-cooling", "ID-Cooling SE-214-XT", '["AM4","AM5","LGA1200","LGA1700"]', "150"),
  cooler("deepcool", "Deepcool AK400", '["AM4","AM5","LGA1200","LGA1700"]', "155"),
  cooler("deepcool", "Deepcool AK620", '["AM4","AM5","LGA1200","LGA1700"]', "160"),
  cooler("bequiet", "be quiet! Pure Rock 2", '["AM4","LGA1200","LGA1700"]', "155"),

  // ─── Cases ───
  pcCase("deepcool", "Deepcool CC560", "ATX", "370", "165"),
  pcCase("deepcool", "Deepcool CH510", "ATX", "380", "175"),
  pcCase("corsair", "Corsair 4000D Airflow", "ATX", "360", "170"),
  pcCase("bequiet", "be quiet! Pure Base 500DX", "ATX", "369", "190"),

  // ─── Peripherals ───
  peripheral("aula", "AULA F2088", "keyboard", "Механічна клавіатура з повнорозмірним layout."),
  peripheral("aula", "AULA F75", "keyboard", "Компактна бездротова 75% клавіатура."),
  peripheral("hyperx", "HyperX Alloy Origins Core", "keyboard", "TKL механічна клавіатура для ігор."),
  peripheral("logitech", "Logitech G413 SE", "keyboard", "Доступна механічна клавіатура для ігор."),
  peripheral("logitech", "Logitech G Pro Mechanical", "keyboard", "Кіберспортивна TKL клавіатура."),

  peripheral("logitech", "Logitech G203 Lightsync", "mouse", "Легка ігрова мишка з RGB-підсвіткою."),
  peripheral("logitech", "Logitech G305 Lightspeed", "mouse", "Бездротова ігрова мишка з HERO-сенсором."),
  peripheral("razer", "Razer DeathAdder V3", "mouse", "Ергономічна ігрова мишка з топовим сенсором."),
  peripheral("razer", "Razer Viper V2 Pro", "mouse", "Легка бездротова кіберспортивна мишка."),
  peripheral("hyperx", "HyperX Pulsefire Haste 2", "mouse", "Легка ігрова мишка для FPS."),

  peripheral("hyperx", "HyperX Cloud II", "headset", "Класична ігрова гарнітура з мікрофоном."),
  peripheral("hyperx", "HyperX Cloud III", "headset", "Оновлена ігрова гарнітура з покращеним звуком."),
  peripheral("razer", "Razer BlackShark V2", "headset", "Легкі ігрові навушники для кіберспорту."),
  peripheral("logitech", "Logitech G435", "headset", "Бездротові легкі навушники для ігор."),

  peripheral("fifine", "Fifine K669B", "microphone", "USB-мікрофон для стримів і дзвінків."),
  peripheral("fifine", "Fifine AmpliGame A8", "microphone", "USB-мікрофон з RGB для стримів."),
  peripheral("maono", "Maono DM30 RGB", "microphone", "Конденсаторний USB-мікрофон для контенту."),
];

// ── Helper factories ──────────────────────────────────────────────────

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cpu(brandSlug: string, model: string, socket: string, cores: string, threads: string): ProductDef {
  const prefix = brandSlug === "intel" ? "Intel Core" : "AMD";
  const fullName = model.startsWith("Core") || model.startsWith("Ryzen") ? `${prefix === "Intel Core" ? "Intel" : "AMD"} ${model}` : `${prefix} ${model}`;
  return {
    slug: slugify(fullName),
    sku: `CPU-${brandSlug.toUpperCase()}-${slugify(model).toUpperCase()}`,
    brandSlug,
    categorySlug: "processors",
    heroImage: "/products/cpu.svg",
    specs: { cores, threads, socket },
    technicalAttributes: { "cpu.socket": socket },
    translations: {
      uk: {
        name: fullName,
        shortDescription: `Процесор ${fullName}, ${cores} ядер, ${threads} потоків, сокет ${socket}.`,
        description: `${fullName} — процесор для настільних ПК. Сокет ${socket}, ${cores} ядер, ${threads} потоків.`,
      },
    },
  };
}

function gpu(model: string): ProductDef {
  return {
    slug: slugify(`nvidia-geforce-${model}`),
    sku: `GPU-NV-${slugify(model).toUpperCase()}`,
    brandSlug: "nvidia",
    categorySlug: "graphics-cards",
    heroImage: "/products/gpu.svg",
    specs: { class: model },
    translations: {
      uk: {
        name: `NVIDIA GeForce ${model}`,
        shortDescription: `Відеокарта NVIDIA GeForce ${model}.`,
        description: `NVIDIA GeForce ${model} — відеокарта для ігор та роботи з графікою.`,
      },
    },
  };
}

function ramVariants(): ProductDef[] {
  const result: ProductDef[] = [];
  const configs = [
    { gb: "8", layout: "1x8 GB" },
    { gb: "16", layout: "2x8 GB" },
    { gb: "32", layout: "2x16 GB" },
    { gb: "64", layout: "2x32 GB" },
  ];
  const types: Array<{ type: string; speeds: string[] }> = [
    { type: "DDR4", speeds: ["2666", "3200", "3600"] },
    { type: "DDR5", speeds: ["5200", "5600", "6000"] },
  ];
  const ramBrands = [
    { slug: "corsair", prefix: "Corsair Vengeance" },
    { slug: "kingston", prefix: "Kingston FURY Beast" },
    { slug: "gskill", prefix: "G.Skill Ripjaws" },
  ];

  for (const brand of ramBrands) {
    for (const memType of types) {
      for (const speed of memType.speeds) {
        for (const cfg of configs) {
          const name = `${brand.prefix} ${cfg.gb}GB ${memType.type}-${speed}`;
          result.push({
            slug: slugify(name),
            sku: `RAM-${brand.slug.toUpperCase().slice(0, 3)}-${cfg.gb}-${memType.type}-${speed}`,
            brandSlug: brand.slug,
            categorySlug: "memory",
            heroImage: "/products/ram.svg",
            specs: { capacity: `${cfg.gb} GB`, layout: cfg.layout, speed: `${speed} MHz`, type: memType.type },
            technicalAttributes: {
              "ram.memory_type": memType.type,
              "ram.speed_mhz": speed,
              "ram.capacity_gb": cfg.gb,
            },
            translations: {
              uk: {
                name,
                shortDescription: `${memType.type} ${cfg.gb}GB (${cfg.layout}) ${speed} MHz.`,
                description: `${name} — комплект оперативної памʼяті ${memType.type} ${speed} MHz, обʼєм ${cfg.gb} GB (${cfg.layout}).`,
              },
            },
          });
        }
      }
    }
  }
  return result;
}

function ssd(brandSlug: string, name: string, capacity: string, iface: string, formFactor: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `SSD-${brandSlug.toUpperCase().slice(0, 3)}-${slugify(name).slice(-12).toUpperCase()}`,
    brandSlug,
    categorySlug: "storage",
    heroImage: "/products/storage.svg",
    specs: { capacity, interface: iface, "form factor": formFactor },
    technicalAttributes: { "storage.interface": iface, "storage.form_factor": formFactor },
    translations: {
      uk: {
        name,
        shortDescription: `SSD ${name}, ${capacity}, ${iface}.`,
        description: `${name} — твердотільний накопичувач ${capacity} з інтерфейсом ${iface}, формат ${formFactor}.`,
      },
    },
  };
}

function hdd(brandSlug: string, name: string, capacity: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `HDD-${brandSlug.toUpperCase().slice(0, 3)}-${slugify(name).slice(-10).toUpperCase()}`,
    brandSlug,
    categorySlug: "storage",
    heroImage: "/products/storage.svg",
    specs: { capacity, interface: "SATA III", "form factor": "3.5 in" },
    translations: {
      uk: {
        name,
        shortDescription: `Жорсткий диск ${name}, ${capacity}, SATA III.`,
        description: `${name} — HDD ${capacity} для зберігання даних, ігор та медіа.`,
      },
    },
  };
}

function mb(brandSlug: string, name: string, chipset: string, socket: string, memType: string, formFactor: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `MB-${brandSlug.toUpperCase().slice(0, 3)}-${slugify(chipset + "-" + name.split(" ").pop()).toUpperCase()}`,
    brandSlug,
    categorySlug: "motherboards",
    heroImage: "/products/motherboard.svg",
    specs: { chipset, socket, memory: memType, "form factor": formFactor },
    technicalAttributes: {
      "motherboard.socket": socket,
      "motherboard.memory_type": memType,
      "motherboard.form_factor": formFactor,
      "motherboard.chipset": chipset,
    },
    translations: {
      uk: {
        name,
        shortDescription: `Материнська плата ${name}, чипсет ${chipset}, сокет ${socket}, ${memType}.`,
        description: `${name} — материнська плата ${formFactor} на чипсеті ${chipset} для платформи ${socket} з підтримкою ${memType}.`,
      },
    },
  };
}

function psu(brandSlug: string, name: string, watts: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `PSU-${brandSlug.toUpperCase().slice(0, 3)}-${watts}W`,
    brandSlug,
    categorySlug: "power-supplies",
    heroImage: "/products/psu.svg",
    specs: { wattage: `${watts} W` },
    technicalAttributes: { "psu.wattage": watts },
    translations: {
      uk: {
        name,
        shortDescription: `Блок живлення ${name}, ${watts} Вт.`,
        description: `${name} — блок живлення потужністю ${watts} Вт для настільних ПК.`,
      },
    },
  };
}

function cooler(brandSlug: string, name: string, sockets: string, height: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `COOL-${brandSlug.toUpperCase().slice(0, 3)}-${slugify(name).slice(-10).toUpperCase()}`,
    brandSlug,
    categorySlug: "cooling",
    heroImage: "/products/cooler.svg",
    specs: { type: "Air cooler", height: `${height} mm` },
    technicalAttributes: {
      "cooler.supported_sockets": sockets,
      "cooler.height_mm": height,
    },
    translations: {
      uk: {
        name,
        shortDescription: `Баштовий кулер ${name}, висота ${height} мм.`,
        description: `${name} — повітряний CPU-кулер висотою ${height} мм для сучасних платформ.`,
      },
    },
  };
}

function pcCase(brandSlug: string, name: string, formFactor: string, maxGpu: string, maxCooler: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `CASE-${brandSlug.toUpperCase().slice(0, 3)}-${slugify(name).slice(-10).toUpperCase()}`,
    brandSlug,
    categorySlug: "cases",
    heroImage: "/products/case.svg",
    specs: { format: `${formFactor} Mid Tower`, "max GPU": `${maxGpu} mm`, "max cooler": `${maxCooler} mm` },
    technicalAttributes: {
      "case.supported_form_factors": `["${formFactor}","Micro-ATX","Mini-ITX"]`,
      "case.max_gpu_length_mm": maxGpu,
      "case.max_cooler_height_mm": maxCooler,
    },
    translations: {
      uk: {
        name,
        shortDescription: `Корпус ${name}, ${formFactor} Mid Tower.`,
        description: `${name} — корпус Mid Tower з підтримкою відеокарт до ${maxGpu} мм та кулерів до ${maxCooler} мм.`,
      },
    },
  };
}

function peripheral(brandSlug: string, name: string, type: string, desc: string): ProductDef {
  return {
    slug: slugify(name),
    sku: `PER-${brandSlug.toUpperCase().slice(0, 3)}-${slugify(name).slice(-10).toUpperCase()}`,
    brandSlug,
    categorySlug: "peripherals",
    heroImage: "/products/peripheral.svg",
    specs: { type },
    translations: {
      uk: {
        name,
        shortDescription: desc,
        description: `${name} — ${desc.charAt(0).toLowerCase()}${desc.slice(1)}`,
      },
    },
  };
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log("Ensuring brands...");
  const brandMap = new Map<string, string>();
  for (const b of brandsToEnsure) {
    const existing = await db.brand.findUnique({ where: { slug: b.slug } });
    if (existing) {
      brandMap.set(b.slug, existing.id);
    } else {
      const created = await db.brand.create({
        data: {
          slug: b.slug,
          website: b.website,
          translations: { create: [{ locale: "uk", name: b.name, summary: b.summary }] },
        },
      });
      brandMap.set(b.slug, created.id);
      console.log(`  + Brand: ${b.name}`);
    }
  }

  console.log("Loading categories...");
  const cats = await db.category.findMany({ select: { id: true, slug: true } });
  const categoryMap = new Map(cats.map((c) => [c.slug, c.id]));

  const CATEGORY_ALIASES: Record<string, string[]> = {
    "storage": ["storage", "ssd"],
    "cooling": ["cooling", "cpu-coolers", "coolers"],
    "cases": ["cases", "case-fans"],
    "power-supplies": ["power-supplies", "psu"],
    "peripherals": ["peripherals"],
  };

  function resolveCategory(slug: string): string | undefined {
    if (categoryMap.has(slug)) return categoryMap.get(slug);
    for (const [canonical, aliases] of Object.entries(CATEGORY_ALIASES)) {
      if (aliases.includes(slug) || canonical === slug) {
        for (const alias of aliases) {
          if (categoryMap.has(alias)) return categoryMap.get(alias);
        }
      }
    }
    return undefined;
  }

  let created = 0;
  let skipped = 0;
  for (const p of products) {
    const categoryId = resolveCategory(p.categorySlug);
    const brandId = brandMap.get(p.brandSlug);
    if (!categoryId || !brandId) {
      console.warn(`  SKIP ${p.slug}: missing category=${p.categorySlug} or brand=${p.brandSlug}`);
      skipped++;
      continue;
    }
    const exists = await db.product.findUnique({ where: { slug: p.slug } });
    if (exists) {
      skipped++;
      continue;
    }

    const ta = Object.fromEntries(
      Object.entries(p.technicalAttributes ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"),
    );

    await db.product.create({
      data: {
        slug: p.slug,
        sku: p.sku,
        categoryId,
        brandId,
        status: "DRAFT",
        price: PLACEHOLDER_PRICE,
        inventoryStatus: "IN_STOCK",
        stock: 200,
        heroImage: p.heroImage,
        gallery: JSON.stringify([p.heroImage]),
        specs: JSON.stringify(p.specs),
        metadata: JSON.stringify({}),
        ...buildTechnicalScalarFields(ta),
        translations: {
          create: [{
            locale: "uk",
            name: p.translations.uk.name,
            shortDescription: p.translations.uk.shortDescription,
            description: p.translations.uk.description,
            seoTitle: p.translations.uk.name,
            seoDescription: p.translations.uk.shortDescription,
          }],
        },
      },
    });
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (duplicates or missing refs).`);
  console.log(`Total product definitions: ${products.length}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
