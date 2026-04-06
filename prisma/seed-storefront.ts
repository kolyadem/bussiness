import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import {
  buildTechnicalScalarFields,
  getAllTechnicalAttributeDefinitions,
  getTechnicalAttributeLabel,
} from "@/lib/configurator/technical-attributes";
import { defaultLocale } from "@/lib/constants";

const locales = ["uk"] as const;

const brands = [
  {
    slug: "amd",
    website: "https://www.amd.com",
    translations: {
      uk: { name: "AMD", summary: "Процесори та платформи для ігор і роботи." },
    },
  },
  {
    slug: "asus",
    website: "https://www.asus.com",
    translations: {
      uk: { name: "ASUS", summary: "Материнські плати, відеокарти, ноутбуки та монітори." },
    },
  },
  {
    slug: "corsair",
    website: "https://www.corsair.com",
    translations: {
      uk: { name: "Corsair", summary: "Памʼять, корпуси, охолодження та блоки живлення." },
    },
  },
  {
    slug: "logitech",
    website: "https://www.logitech.com",
    translations: {
      uk: { name: "Logitech", summary: "Преміальна периферія для продуктивності та ігор." },
    },
  },
  {
    slug: "samsung",
    website: "https://www.samsung.com",
    translations: {
      uk: { name: "Samsung", summary: "Швидкі накопичувачі та premium дисплеї." },
    },
  },
];

const categories = [
  {
    slug: "ready-pcs",
    image: "/products/ready-pc.svg",
    translations: {
      uk: { name: "Готові ПК", description: "Збалансовані premium-системи." },
    },
  },
  {
    slug: "processors",
    image: "/products/cpu.svg",
    translations: {
      uk: { name: "Процесори", description: "Сучасні CPU для ігор та роботи." },
    },
  },
  {
    slug: "motherboards",
    image: "/products/motherboard.svg",
    translations: {
      uk: { name: "Материнські плати", description: "Основа збалансованої збірки." },
    },
  },
  {
    slug: "memory",
    image: "/products/ram.svg",
    translations: {
      uk: { name: "Оперативна памʼять", description: "Швидкі DDR5-комплекти." },
    },
  },
  {
    slug: "graphics-cards",
    image: "/products/gpu.svg",
    translations: {
      uk: { name: "Відеокарти", description: "GPU для AAA-ігор і creator-задач." },
    },
  },
  {
    slug: "storage",
    image: "/products/storage.svg",
    translations: {
      uk: { name: "SSD / HDD", description: "Накопичувачі для системи та бібліотеки." },
    },
  },
  {
    slug: "power-supplies",
    image: "/products/psu.svg",
    translations: {
      uk: { name: "Блоки живлення", description: "Надійне живлення із запасом по потужності." },
    },
  },
  {
    slug: "cooling",
    image: "/products/cooler.svg",
    translations: {
      uk: { name: "Охолодження", description: "Кулери для тихої та стабільної роботи системи." },
    },
  },
  {
    slug: "cases",
    image: "/products/case.svg",
    translations: {
      uk: { name: "Корпуси", description: "Корпуси з підтримкою сучасних high-end компонентів." },
    },
  },
  {
    slug: "monitors",
    image: "/products/monitor.svg",
    translations: {
      uk: { name: "Монітори", description: "Ігрові та creator-дисплеї." },
    },
  },
  {
    slug: "peripherals",
    image: "/products/peripheral.svg",
    translations: {
      uk: { name: "Периферія", description: "Клавіатури, мишки та гарнітури." },
    },
  },
  {
    slug: "laptops",
    image: "/products/laptop.svg",
    translations: {
      uk: { name: "Ноутбуки", description: "Преміальні мобільні станції." },
    },
  },
];

const products = [
  {
    slug: "amd-ryzen-7-7800x3d",
    sku: "CPU-AMD-7800X3D",
    brandSlug: "amd",
    categorySlug: "processors",
    price: 44900,
    oldPrice: 48900,
    inventoryStatus: "IN_STOCK",
    stock: 18,
    heroImage: "/products/cpu.svg",
    gallery: ["/products/cpu.svg"],
    specs: { cores: 8, threads: 16, boost: "5.0 GHz", socket: "AM5" },
    metadata: { featured: true },
    technicalAttributes: {
      "cpu.socket": "AM5",
      "cpu.tdp": "120",
    },
    translations: {
      uk: {
        name: "AMD Ryzen 7 7800X3D",
        shortDescription: "Флагманський геймерський процесор для сучасних AM5-збірок.",
        description: "Один з найкращих CPU для high-end gaming з акцентом на FPS та енергоефективність.",
      },
    },
    reviews: [
      { author: "Dmytro P.", rating: 5, title: "Топ для gaming", body: "Дає чудовий FPS у парі з RTX 4070 Ti Super." },
    ],
  },
  {
    slug: "asus-rog-strix-b650e-e",
    sku: "MB-ASUS-B650E",
    brandSlug: "asus",
    categorySlug: "motherboards",
    price: 32900,
    oldPrice: 35900,
    inventoryStatus: "IN_STOCK",
    stock: 9,
    heroImage: "/products/motherboard.svg",
    gallery: ["/products/motherboard.svg"],
    specs: { chipset: "B650E", socket: "AM5", memory: "DDR5", wifi: "Wi-Fi 6E" },
    metadata: { featured: true },
    technicalAttributes: {
      "motherboard.socket": "AM5",
      "motherboard.memory_type": "DDR5",
      "motherboard.form_factor": "ATX",
      "motherboard.chipset": "B650E",
    },
    translations: {
      uk: {
        name: "ASUS ROG Strix B650E-E Gaming WiFi",
        shortDescription: "Преміальна материнська плата AM5 з Wi‑Fi 6E.",
        description: "Сильна основа для Ryzen 7000/8000 із сучасним I/O, надійним VRM і clean white build aesthetic.",
      },
    },
    reviews: [],
  },
  {
    slug: "corsair-vengeance-rgb-32gb-ddr5-6000",
    sku: "RAM-COR-32-6000",
    brandSlug: "corsair",
    categorySlug: "memory",
    price: 13900,
    oldPrice: 15900,
    inventoryStatus: "IN_STOCK",
    stock: 27,
    heroImage: "/products/ram.svg",
    gallery: ["/products/ram.svg"],
    specs: { capacity: "32 GB", layout: "2x16 GB", speed: "6000 MHz", timings: "CL30" },
    metadata: { featured: true },
    technicalAttributes: {
      "ram.memory_type": "DDR5",
      "ram.speed_mhz": "6000",
      "ram.capacity_gb": "32",
    },
    translations: {
      uk: {
        name: "Corsair Vengeance RGB 32GB DDR5-6000",
        shortDescription: "Швидкий DDR5-комплект для сучасних платформ.",
        description: "Збалансований комплект для ігор, стримінгу та роботи з помітним RGB-акцентом.",
      },
    },
    reviews: [],
  },
  {
    slug: "asus-proart-rtx-4070-ti-super",
    sku: "GPU-ASUS-4070TS",
    brandSlug: "asus",
    categorySlug: "graphics-cards",
    price: 89900,
    oldPrice: 94900,
    inventoryStatus: "LOW_STOCK",
    stock: 6,
    heroImage: "/products/gpu.svg",
    gallery: ["/products/gpu.svg"],
    specs: { vram: "16 GB", class: "RTX 4070 Ti Super", cooling: "Triple fan", length: "300 mm" },
    metadata: { featured: true },
    technicalAttributes: {
      "gpu.length_mm": "300",
      "gpu.power_draw_w": "285",
      "gpu.recommended_psu_w": "750",
    },
    translations: {
      uk: {
        name: "ASUS ProArt GeForce RTX 4070 Ti Super",
        shortDescription: "Тиха відеокарта для 1440p/4K і creator-сценаріїв.",
        description: "Потужна та стильна модель для преміальних збірок, де важливі і FPS, і візуальна акуратність.",
      },
    },
    reviews: [
      { author: "Ihor V.", rating: 5, title: "Тиха і дуже швидка", body: "Чудово тримає 1440p ultrawide і не шумить під навантаженням." },
    ],
  },
  {
    slug: "samsung-990-pro-2tb",
    sku: "SSD-SAM-990PRO2TB",
    brandSlug: "samsung",
    categorySlug: "storage",
    price: 16900,
    oldPrice: 18900,
    inventoryStatus: "IN_STOCK",
    stock: 21,
    heroImage: "/products/storage.svg",
    gallery: ["/products/storage.svg"],
    specs: { capacity: "2 TB", interface: "PCIe 4.0", read: "7450 MB/s", write: "6900 MB/s" },
    metadata: { featured: true },
    technicalAttributes: {
      "storage.interface": "PCIe 4.0 NVMe",
      "storage.form_factor": "M.2 2280",
    },
    translations: {
      uk: {
        name: "Samsung 990 PRO 2TB",
        shortDescription: "Преміальний NVMe SSD для системи, ігор і робочих файлів.",
        description: "Один із найшвидших накопичувачів для high-end конфігурацій з відмінною стабільністю.",
      },
    },
    reviews: [
      { author: "Mia L.", rating: 4, title: "Швидкий та стабільний", body: "Система запускається майже миттєво, а великі проєкти відкриваються без пауз." },
    ],
  },
  {
    slug: "corsair-rm850e",
    sku: "PSU-COR-RM850E",
    brandSlug: "corsair",
    categorySlug: "power-supplies",
    price: 12900,
    oldPrice: 14900,
    inventoryStatus: "IN_STOCK",
    stock: 11,
    heroImage: "/products/psu.svg",
    gallery: ["/products/psu.svg"],
    specs: { wattage: "850 W", certification: "80+ Gold", modular: "Fully modular" },
    metadata: { featured: true },
    technicalAttributes: {
      "psu.wattage": "850",
    },
    translations: {
      uk: {
        name: "Corsair RM850e",
        shortDescription: "Тихий 850W блок живлення для сучасних high-end збірок.",
        description: "Надійний 80+ Gold PSU із запасом по потужності для систем з продуктивною відеокартою.",
      },
    },
    reviews: [],
  },
  {
    slug: "corsair-4000d-airflow",
    sku: "CASE-COR-4000D",
    brandSlug: "corsair",
    categorySlug: "cases",
    price: 9900,
    oldPrice: 11400,
    inventoryStatus: "IN_STOCK",
    stock: 8,
    heroImage: "/products/case.svg",
    gallery: ["/products/case.svg"],
    specs: { format: "ATX Mid Tower", gpu: "360 mm", cooler: "170 mm" },
    metadata: {
      featured: true,
      priceTracking: {
        telemartUrl:
          "https://telemart.ua/ua/products/corsair-4000d-airflow-tempered-glass-bez-bp-cc-9011200-ww-black/",
      },
    },
    technicalAttributes: {
      "case.supported_form_factors": "[\"ATX\",\"Micro-ATX\",\"Mini-ITX\"]",
      "case.max_gpu_length_mm": "360",
      "case.max_cooler_height_mm": "170",
    },
    translations: {
      uk: {
        name: "Corsair 4000D Airflow",
        shortDescription: "Продуваний корпус для чистих та потужних збірок.",
        description: "Корпус із підтримкою ATX-плат, довгих відеокарт і високих повітряних кулерів.",
      },
    },
    reviews: [],
  },
  {
    slug: "corsair-a115",
    sku: "COOL-COR-A115",
    brandSlug: "corsair",
    categorySlug: "cooling",
    price: 7900,
    oldPrice: 8900,
    inventoryStatus: "IN_STOCK",
    stock: 7,
    heroImage: "/products/cooler.svg",
    gallery: ["/products/cooler.svg"],
    specs: { type: "Air cooler", height: "160 mm", sockets: "AM5, LGA1700" },
    metadata: {
      featured: true,
      priceTracking: {
        telemartUrl: "https://telemart.ua/products/corsair-a115-ct-9010011-ww-black/",
      },
    },
    technicalAttributes: {
      "cooler.supported_sockets": "[\"AM5\",\"LGA1700\"]",
      "cooler.height_mm": "160",
    },
    translations: {
      uk: {
        name: "Corsair A115",
        shortDescription: "Потужний повітряний кулер для сучасних сокетів.",
        description: "Великий баштовий кулер з підтримкою AM5 та достатнім запасом для ігрових систем.",
      },
    },
    reviews: [],
  },
  {
    slug: "samsung-odyssey-oled-g8-34",
    sku: "MON-SAM-G8OLED",
    brandSlug: "samsung",
    categorySlug: "monitors",
    price: 49900,
    oldPrice: 53900,
    inventoryStatus: "LOW_STOCK",
    stock: 5,
    heroImage: "/products/monitor.svg",
    gallery: ["/products/monitor.svg"],
    specs: { size: "34 in", panel: "OLED", refresh: "175 Hz", resolution: "3440x1440" },
    metadata: { featured: false },
    translations: {
      uk: {
        name: "Samsung Odyssey OLED G8 34\"",
        shortDescription: "Ультраширокий OLED-монітор для premium desk setup.",
        description: "Глибокий контраст, швидка матриця та елегантний дизайн для ігор і multitasking.",
      },
    },
    reviews: [],
  },
  {
    slug: "logitech-g915-x-lightspeed",
    sku: "KB-LOG-G915X",
    brandSlug: "logitech",
    categorySlug: "peripherals",
    price: 10900,
    oldPrice: 12900,
    inventoryStatus: "IN_STOCK",
    stock: 14,
    heroImage: "/products/keyboard.svg",
    gallery: ["/products/keyboard.svg"],
    specs: { type: "Mechanical", layout: "TKL", connection: "Wireless", profile: "Low profile" },
    metadata: { featured: false },
    translations: {
      uk: {
        name: "Logitech G915 X Lightspeed TKL",
        shortDescription: "Бездротова low-profile клавіатура з premium відчуттям.",
        description: "Легка, тиха й акуратна модель для геймінгу та повсякденної роботи.",
      },
    },
    reviews: [],
  },
  {
    slug: "logitech-g-pro-x-superlight-2",
    sku: "MOUSE-LOG-GPROX2",
    brandSlug: "logitech",
    categorySlug: "peripherals",
    price: 6900,
    oldPrice: 7900,
    inventoryStatus: "IN_STOCK",
    stock: 20,
    heroImage: "/products/mouse.svg",
    gallery: ["/products/mouse.svg"],
    specs: { weight: "60 g", sensor: "HERO 2", connection: "Wireless" },
    metadata: { featured: false },
    translations: {
      uk: {
        name: "Logitech G Pro X Superlight 2",
        shortDescription: "Легка кіберспортивна мишка з топовим сенсором.",
        description: "Один із найкращих варіантів для тих, хто хоче швидкість, точність і мінімальну вагу.",
      },
    },
    reviews: [],
  },
  {
    slug: "asus-rog-zephyrus-g16",
    sku: "LAP-ASUS-G16",
    brandSlug: "asus",
    categorySlug: "laptops",
    price: 119900,
    oldPrice: 129900,
    inventoryStatus: "LOW_STOCK",
    stock: 4,
    heroImage: "/products/laptop.svg",
    gallery: ["/products/laptop.svg"],
    specs: { display: "16 in OLED 240 Hz", cpu: "Core Ultra 9", gpu: "RTX 4070 Laptop", ram: "32 GB" },
    metadata: { featured: false },
    translations: {
      uk: {
        name: "ASUS ROG Zephyrus G16",
        shortDescription: "Тонкий premium-ноутбук для creator і gaming-сценаріїв.",
        description: "Потужний ноутбук з красивим OLED-дисплеєм, якісним корпусом та відмінним балансом мобільності й продуктивності.",
      },
    },
    reviews: [],
  },
  {
    slug: "lumina-aurora-x3d",
    sku: "PC-LUMINA-AURORA",
    brandSlug: "corsair",
    categorySlug: "ready-pcs",
    price: 199900,
    oldPrice: 214900,
    inventoryStatus: "LOW_STOCK",
    stock: 3,
    heroImage: "/products/ready-pc.svg",
    gallery: ["/products/ready-pc.svg"],
    specs: { cpu: "Ryzen 7 7800X3D", gpu: "RTX 4070 Ti Super", ram: "32 GB DDR5", storage: "2 TB NVMe" },
    metadata: { featured: true },
    translations: {
      uk: {
        name: "Lumina Aurora X3D",
        shortDescription: "Готовий premium gaming PC з акцентом на FPS і тишу.",
        description: "Збалансована флагманська збірка для тих, хто хоче стильний корпус, високий FPS і мінімум компромісів.",
      },
    },
    reviews: [
      { author: "Artem K.", rating: 5, title: "Ідеальний ready-to-go", body: "Дуже акуратна збірка, тихий корпус і відчуття повністю готового premium продукту." },
    ],
  },
];

const banners = [
  {
    key: "hero-main",
    type: "HERO",
    href: "/uk/catalog",
    image: "/hero/orbit.svg",
    translations: {
      uk: {
        title: "Техніка, зібрана без випадкових компромісів",
        subtitle: "Преміальний каталог компонентів, готових ПК і периферії з реальними даними, локалізаціями та clean UX.",
        ctaLabel: "Перейти до каталогу",
      },
    },
  },
];

async function syncProductTechnicalAttributes(
  productId: string,
  technicalAttributes: Record<string, string>,
) {
  const definitions = getAllTechnicalAttributeDefinitions();
  const attributeRecords = await Promise.all(
    definitions.map((definition) =>
      db.productAttribute.upsert({
        where: {
          code: definition.code,
        },
        update: {
          label: getTechnicalAttributeLabel(definition, defaultLocale),
          unit: definition.unit ?? null,
        },
        create: {
          code: definition.code,
          label: getTechnicalAttributeLabel(definition, defaultLocale),
          unit: definition.unit ?? null,
        },
        select: {
          id: true,
          code: true,
        },
      }),
    ),
  );

  const values = attributeRecords.flatMap((attribute) => {
    const value = technicalAttributes[attribute.code];

    if (!value) {
      return [];
    }

    return [
      {
        attributeId: attribute.id,
        productId,
        value,
      },
    ];
  });

  if (values.length > 0) {
    await db.productAttributeValue.createMany({
      data: values,
    });
  }
}

async function seedCompatibilityRules() {
  const attributes = await db.productAttribute.findMany({
    select: {
      id: true,
      code: true,
    },
  });
  const attributeByCode = new Map(attributes.map((attribute) => [attribute.code, attribute.id]));
  const rules = [
    {
      code: "cpu-motherboard-socket",
      name: "CPU to motherboard socket",
      description: "CPU socket must match motherboard socket.",
      severity: "ERROR",
      sourceSlot: "cpu",
      targetSlot: "motherboard",
      sourceAttributeId: attributeByCode.get("cpu.socket") ?? null,
      targetAttributeId: attributeByCode.get("motherboard.socket") ?? null,
      comparator: "EQUALS",
      messageKey: "cpu_motherboard_socket_mismatch",
    },
    {
      code: "motherboard-ram-memory-type",
      name: "Motherboard to RAM memory type",
      description: "Motherboard memory type must match RAM memory type.",
      severity: "ERROR",
      sourceSlot: "motherboard",
      targetSlot: "ram",
      sourceAttributeId: attributeByCode.get("motherboard.memory_type") ?? null,
      targetAttributeId: attributeByCode.get("ram.memory_type") ?? null,
      comparator: "EQUALS",
      messageKey: "motherboard_ram_memory_type_mismatch",
    },
    {
      code: "cooler-supported-sockets",
      name: "Cooler socket support",
      description: "Cooler supported sockets must include the selected CPU socket.",
      severity: "ERROR",
      sourceSlot: "cooling",
      targetSlot: "cpu",
      sourceAttributeId: attributeByCode.get("cooler.supported_sockets") ?? null,
      targetAttributeId: attributeByCode.get("cpu.socket") ?? null,
      comparator: "SOURCE_INCLUDES_TARGET",
      messageKey: "cooler_socket_unsupported",
    },
    {
      code: "gpu-case-length",
      name: "GPU length to case max length",
      description: "GPU length must not exceed case max GPU length.",
      severity: "ERROR",
      sourceSlot: "gpu",
      targetSlot: "case",
      sourceAttributeId: attributeByCode.get("gpu.length_mm") ?? null,
      targetAttributeId: attributeByCode.get("case.max_gpu_length_mm") ?? null,
      comparator: "LTE",
      messageKey: "gpu_case_length_exceeded",
    },
    {
      code: "case-motherboard-form-factor",
      name: "Case to motherboard form factor",
      description: "Case supported form factors must include the motherboard form factor.",
      severity: "ERROR",
      sourceSlot: "case",
      targetSlot: "motherboard",
      sourceAttributeId: attributeByCode.get("case.supported_form_factors") ?? null,
      targetAttributeId: attributeByCode.get("motherboard.form_factor") ?? null,
      comparator: "SOURCE_INCLUDES_TARGET",
      messageKey: "motherboard_case_form_factor_unsupported",
    },
  ];

  for (const rule of rules) {
    await db.compatibilityRule.upsert({
      where: {
        code: rule.code,
      },
      update: rule,
      create: {
        ...rule,
        sourceType: "ATTRIBUTE",
        targetType: "ATTRIBUTE",
      },
    });
  }
}

async function main() {
  const passwordHash = await hash("Admin12345!", 10);

  await db.review.deleteMany();
  await db.cartItem.deleteMany();
  await db.cart.deleteMany();
  await db.wishlistItem.deleteMany();
  await db.compareItem.deleteMany();
  await db.pcBuildRequest.deleteMany();
  await db.pcBuildItem.deleteMany();
  await db.pcBuild.deleteMany();
  await db.compatibilityRule.deleteMany();
  await db.productAttributeValue.deleteMany();
  await db.productAttribute.deleteMany();
  await db.productTranslation.deleteMany();
  await db.product.deleteMany();
  await db.categoryTranslation.deleteMany();
  await db.category.deleteMany();
  await db.brandTranslation.deleteMany();
  await db.brand.deleteMany();
  await db.bannerTranslation.deleteMany();
  await db.banner.deleteMany();
  await db.siteSettings.deleteMany();
  await db.user.deleteMany();

  await db.user.create({
    data: {
      login: "store-admin",
      name: "Store Admin",
      email: "admin@luminatech.store",
      passwordHash,
      role: "ADMIN",
      locale: "uk",
    },
  });

  const brandMap = new Map<string, string>();
  for (const [index, brand] of brands.entries()) {
    const created = await db.brand.create({
      data: {
        slug: brand.slug,
        website: brand.website,
        sortOrder: index,
        translations: {
          create: locales.map((locale) => ({
            locale,
            name: brand.translations[locale].name,
            summary: brand.translations[locale].summary,
          })),
        },
      },
    });
    brandMap.set(brand.slug, created.id);
  }

  const categoryMap = new Map<string, string>();
  for (const [index, category] of categories.entries()) {
    const created = await db.category.create({
      data: {
        slug: category.slug,
        image: category.image,
        sortOrder: index,
        translations: {
          create: locales.map((locale) => ({
            locale,
            name: category.translations[locale].name,
            description: category.translations[locale].description,
          })),
        },
      },
    });
    categoryMap.set(category.slug, created.id);
  }

  for (const product of products) {
    const technicalAttributes = Object.fromEntries(
      Object.entries(product.technicalAttributes ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );

    const created = await db.product.create({
      data: {
        slug: product.slug,
        sku: product.sku,
        categoryId: categoryMap.get(product.categorySlug)!,
        brandId: brandMap.get(product.brandSlug)!,
        price: product.price,
        oldPrice: product.oldPrice,
        inventoryStatus: product.inventoryStatus,
        stock: product.stock,
        heroImage: product.heroImage,
        gallery: JSON.stringify(product.gallery),
        specs: JSON.stringify(product.specs),
        metadata: JSON.stringify(product.metadata),
        ...buildTechnicalScalarFields(technicalAttributes),
        translations: {
          create: locales.map((locale) => ({
            locale,
            name: product.translations[locale].name,
            shortDescription: product.translations[locale].shortDescription,
            description: product.translations[locale].description,
            seoTitle: product.translations[locale].name,
            seoDescription: product.translations[locale].shortDescription,
          })),
        },
      },
    });

    await syncProductTechnicalAttributes(created.id, technicalAttributes);

    if (product.reviews.length > 0) {
      await db.review.createMany({
        data: product.reviews.map((review) => ({
          productId: created.id,
          author: review.author,
          rating: review.rating,
          title: review.title,
          body: review.body,
          status: "APPROVED",
        })),
      });
    }
  }

  for (const [index, banner] of banners.entries()) {
    await db.banner.create({
      data: {
        key: banner.key,
        type: banner.type,
        href: banner.href,
        image: banner.image,
        sortOrder: index,
        translations: {
          create: locales.map((locale) => ({
            locale,
            title: banner.translations[locale].title,
            subtitle: banner.translations[locale].subtitle,
            ctaLabel: banner.translations[locale].ctaLabel,
          })),
        },
      },
    });
  }

  await seedCompatibilityRules();

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
      facebookUrl: "https://facebook.com/luminatech",
      instagramUrl: "https://instagram.com/luminatech",
      telegramUrl: "https://t.me/luminatech",
      youtubeUrl: "https://youtube.com/@luminatech",
      metaTitle: "Lumina Tech — збірка ПК та комплектуючі",
      metaDescription:
        "Конфігуратор ПК, сумісність компонентів, каталог комплектуючих та готових систем.",
      faviconPath: "/favicon.ico",
      defaultCurrency: "UAH",
      defaultLocale: "uk",
      watermarkText: "LUMINA",
      heroTitle: "Збірка ПК під ваші задачі",
      heroSubtitle: "Конфігуратор сумісності, каталог комплектуючих і готові рішення в одному місці.",
      heroCtaLabel: "Конфігуратор",
      heroCtaHref: "/uk/configurator",
      featuredCategorySlugs: JSON.stringify(["ready-pcs", "processors", "graphics-cards"]),
      featuredProductIds: JSON.stringify([]),
      },
    });

  console.log("Seed completed");
  console.log("Admin: admin@luminatech.store / Admin12345!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
