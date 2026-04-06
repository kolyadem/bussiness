import "dotenv/config";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import {
  buildTechnicalScalarFields,
  getAllTechnicalAttributeDefinitions,
  getTechnicalAttributeLabel,
} from "@/lib/configurator/technical-attributes";
const locales = ["uk", "ru", "en"] as const;

const brands = [
  {
    slug: "amd",
    website: "https://www.amd.com",
    translations: {
      uk: { name: "AMD", summary: "Процесори та платформи для ігор і роботи." },
      ru: { name: "AMD", summary: "Процессоры и платформы для игр и работы." },
      en: { name: "AMD", summary: "Processors and platforms for gaming and work." },
    },
  },
  {
    slug: "asus",
    website: "https://www.asus.com",
    translations: {
      uk: { name: "ASUS", summary: "Материнські плати, відеокарти, ноутбуки та монітори." },
      ru: { name: "ASUS", summary: "Материнские платы, видеокарты, ноутбуки и мониторы." },
      en: { name: "ASUS", summary: "Motherboards, graphics cards, laptops and displays." },
    },
  },
  {
    slug: "corsair",
    website: "https://www.corsair.com",
    translations: {
      uk: { name: "Corsair", summary: "Памʼять, корпуси, охолодження та блоки живлення." },
      ru: { name: "Corsair", summary: "Память, корпуса, охлаждение и блоки питания." },
      en: { name: "Corsair", summary: "Memory, cases, cooling and power supplies." },
    },
  },
  {
    slug: "logitech",
    website: "https://www.logitech.com",
    translations: {
      uk: { name: "Logitech", summary: "Преміальна периферія для продуктивності та ігор." },
      ru: { name: "Logitech", summary: "Премиальная периферия для продуктивности и игр." },
      en: { name: "Logitech", summary: "Premium peripherals for productivity and gaming." },
    },
  },
  {
    slug: "samsung",
    website: "https://www.samsung.com",
    translations: {
      uk: { name: "Samsung", summary: "Швидкі накопичувачі та premium дисплеї." },
      ru: { name: "Samsung", summary: "Быстрые накопители и premium дисплеи." },
      en: { name: "Samsung", summary: "Fast storage and premium displays." },
    },
  },
];

const categories = [
  {
    slug: "ready-pcs",
    image: "/products/ready-pc.svg",
    translations: {
      uk: { name: "Готові ПК", description: "Збалансовані premium-системи." },
      ru: { name: "Готовые ПК", description: "Сбалансированные premium-системы." },
      en: { name: "Ready PCs", description: "Balanced premium systems." },
    },
  },
  {
    slug: "processors",
    image: "/products/cpu.svg",
    translations: {
      uk: { name: "Процесори", description: "Сучасні CPU для ігор та роботи." },
      ru: { name: "Процессоры", description: "Современные CPU для игр и работы." },
      en: { name: "Processors", description: "Modern CPUs for gaming and work." },
    },
  },
  {
    slug: "motherboards",
    image: "/products/motherboard.svg",
    translations: {
      uk: { name: "Материнські плати", description: "Основа збалансованої збірки." },
      ru: { name: "Материнские платы", description: "Основа сбалансированной сборки." },
      en: { name: "Motherboards", description: "The core of a balanced build." },
    },
  },
  {
    slug: "memory",
    image: "/products/ram.svg",
    translations: {
      uk: { name: "Оперативна памʼять", description: "Швидкі DDR5-комплекти." },
      ru: { name: "Оперативная память", description: "Быстрые DDR5-комплекты." },
      en: { name: "Memory", description: "Fast DDR5 kits." },
    },
  },
  {
    slug: "graphics-cards",
    image: "/products/gpu.svg",
    translations: {
      uk: { name: "Відеокарти", description: "GPU для AAA-ігор і creator-задач." },
      ru: { name: "Видеокарты", description: "GPU для AAA-игр и creator-задач." },
      en: { name: "Graphics cards", description: "GPUs for AAA gaming and creator workloads." },
    },
  },
  {
    slug: "storage",
    image: "/products/storage.svg",
    translations: {
      uk: { name: "SSD / HDD", description: "Накопичувачі для системи та бібліотеки." },
      ru: { name: "SSD / HDD", description: "Накопители для системы и библиотеки." },
      en: { name: "SSD / HDD", description: "Storage for OS and game libraries." },
    },
  },
  {
    slug: "power-supplies",
    image: "/products/psu.svg",
    translations: {
      uk: { name: "Блоки живлення", description: "Надійне живлення із запасом по потужності." },
      ru: { name: "Блоки питания", description: "Надежное питание с запасом по мощности." },
      en: { name: "Power supplies", description: "Stable power delivery with room to grow." },
    },
  },
  {
    slug: "cooling",
    image: "/products/cooler.svg",
    translations: {
      uk: { name: "Охолодження", description: "Кулери для тихої та стабільної роботи системи." },
      ru: { name: "Охлаждение", description: "Кулеры для тихой и стабильной работы системы." },
      en: { name: "Cooling", description: "Cooling solutions for quiet, stable builds." },
    },
  },
  {
    slug: "cases",
    image: "/products/case.svg",
    translations: {
      uk: { name: "Корпуси", description: "Корпуси з підтримкою сучасних high-end компонентів." },
      ru: { name: "Корпуса", description: "Корпуса с поддержкой современных high-end компонентов." },
      en: { name: "Cases", description: "Cases built for modern premium components." },
    },
  },
  {
    slug: "monitors",
    image: "/products/monitor.svg",
    translations: {
      uk: { name: "Монітори", description: "Ігрові та creator-дисплеї." },
      ru: { name: "Мониторы", description: "Игровые и creator-дисплеи." },
      en: { name: "Monitors", description: "Gaming and creator displays." },
    },
  },
  {
    slug: "peripherals",
    image: "/products/peripheral.svg",
    translations: {
      uk: { name: "Периферія", description: "Клавіатури, мишки та гарнітури." },
      ru: { name: "Периферия", description: "Клавиатуры, мышки и гарнитуры." },
      en: { name: "Peripherals", description: "Keyboards, mice and headsets." },
    },
  },
  {
    slug: "laptops",
    image: "/products/laptop.svg",
    translations: {
      uk: { name: "Ноутбуки", description: "Преміальні мобільні станції." },
      ru: { name: "Ноутбуки", description: "Премиальные мобильные станции." },
      en: { name: "Laptops", description: "Premium mobile workstations." },
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
      ru: {
        name: "AMD Ryzen 7 7800X3D",
        shortDescription: "Флагманский игровой процессор для современных AM5-сборок.",
        description: "Один из лучших CPU для high-end gaming с акцентом на FPS и энергоэффективность.",
      },
      en: {
        name: "AMD Ryzen 7 7800X3D",
        shortDescription: "Flagship gaming processor for modern AM5 builds.",
        description: "One of the strongest CPUs for high-end gaming with elite frame-rate efficiency.",
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
      ru: {
        name: "ASUS ROG Strix B650E-E Gaming WiFi",
        shortDescription: "Премиальная материнская плата AM5 с Wi‑Fi 6E.",
        description: "Сильная база для Ryzen 7000/8000 с современным I/O, надежным VRM и clean white build aesthetic.",
      },
      en: {
        name: "ASUS ROG Strix B650E-E Gaming WiFi",
        shortDescription: "Premium AM5 motherboard with Wi‑Fi 6E.",
        description: "A polished AM5 board with strong power delivery, fast connectivity and premium design language.",
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
      ru: {
        name: "Corsair Vengeance RGB 32GB DDR5-6000",
        shortDescription: "Быстрый DDR5-комплект для современных платформ.",
        description: "Сбалансированный комплект для игр, стриминга и работы с заметным RGB-акцентом.",
      },
      en: {
        name: "Corsair Vengeance RGB 32GB DDR5-6000",
        shortDescription: "Fast DDR5 kit for modern platforms.",
        description: "A balanced memory kit for gaming, streaming and work with tasteful RGB styling.",
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
      ru: {
        name: "ASUS ProArt GeForce RTX 4070 Ti Super",
        shortDescription: "Тихая видеокарта для 1440p/4K и creator-сценариев.",
        description: "Мощная и стильная модель для премиальных сборок, где важны и FPS, и визуальная аккуратность.",
      },
      en: {
        name: "ASUS ProArt GeForce RTX 4070 Ti Super",
        shortDescription: "Quiet GPU for 1440p/4K and creator workflows.",
        description: "A strong, refined graphics card for premium systems where performance and aesthetics both matter.",
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
      ru: {
        name: "Samsung 990 PRO 2TB",
        shortDescription: "Премиальный NVMe SSD для системы, игр и рабочих файлов.",
        description: "Один из самых быстрых накопителей для high-end конфигураций с отличной стабильностью.",
      },
      en: {
        name: "Samsung 990 PRO 2TB",
        shortDescription: "Premium NVMe SSD for OS, games and work files.",
        description: "One of the fastest SSDs for high-end systems with strong sustained performance.",
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
      ru: {
        name: "Corsair RM850e",
        shortDescription: "Тихий 850W блок питания для современных high-end сборок.",
        description: "Надежный 80+ Gold PSU с запасом по мощности для систем с производительной видеокартой.",
      },
      en: {
        name: "Corsair RM850e",
        shortDescription: "Quiet 850W PSU for modern high-end builds.",
        description: "A dependable 80+ Gold PSU with enough headroom for premium gaming systems.",
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
      ru: {
        name: "Corsair 4000D Airflow",
        shortDescription: "Продуваемый корпус для чистых и мощных сборок.",
        description: "Корпус с поддержкой ATX-плат, длинных видеокарт и высоких воздушных кулеров.",
      },
      en: {
        name: "Corsair 4000D Airflow",
        shortDescription: "Airflow-focused case for clean, powerful systems.",
        description: "A case with room for ATX boards, long GPUs, and tall air coolers.",
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
      ru: {
        name: "Corsair A115",
        shortDescription: "Мощный воздушный кулер для современных сокетов.",
        description: "Крупный башенный кулер с поддержкой AM5 и запасом для игровых систем.",
      },
      en: {
        name: "Corsair A115",
        shortDescription: "High-performance air cooler for modern sockets.",
        description: "A large dual-tower air cooler with AM5 support for premium gaming builds.",
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
      ru: {
        name: "Samsung Odyssey OLED G8 34\"",
        shortDescription: "Ультраширокий OLED-монитор для premium desk setup.",
        description: "Глубокий контраст, быстрая матрица и элегантный дизайн для игр и multitasking.",
      },
      en: {
        name: "Samsung Odyssey OLED G8 34\"",
        shortDescription: "Ultrawide OLED monitor for a premium desk setup.",
        description: "Deep contrast, a fast panel and an elegant industrial design for gaming and multitasking.",
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
      ru: {
        name: "Logitech G915 X Lightspeed TKL",
        shortDescription: "Беспроводная low-profile клавиатура с premium ощущением.",
        description: "Легкая, тихая и аккуратная модель для гейминга и повседневной работы.",
      },
      en: {
        name: "Logitech G915 X Lightspeed TKL",
        shortDescription: "Wireless low-profile keyboard with a premium feel.",
        description: "A slim, polished keyboard for gaming and everyday work with strong battery life.",
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
      ru: {
        name: "Logitech G Pro X Superlight 2",
        shortDescription: "Легкая киберспортивная мышка с топовым сенсором.",
        description: "Один из лучших вариантов для тех, кто хочет скорость, точность и минимальный вес.",
      },
      en: {
        name: "Logitech G Pro X Superlight 2",
        shortDescription: "Ultra-light esports mouse with a flagship sensor.",
        description: "A top-tier wireless mouse built for speed, precision and ultra-low weight.",
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
      ru: {
        name: "ASUS ROG Zephyrus G16",
        shortDescription: "Тонкий premium-ноутбук для creator и gaming-сценариев.",
        description: "Мощный ноутбук с красивым OLED-дисплеем, качественным корпусом и отличным балансом мобильности и производительности.",
      },
      en: {
        name: "ASUS ROG Zephyrus G16",
        shortDescription: "Slim premium laptop for creator and gaming workflows.",
        description: "A refined laptop with an OLED display, strong performance and premium portability.",
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
      ru: {
        name: "Lumina Aurora X3D",
        shortDescription: "Готовый premium gaming PC с акцентом на FPS и тишину.",
        description: "Сбалансированная флагманская сборка для тех, кто хочет стильный корпус, высокий FPS и минимум компромиссов.",
      },
      en: {
        name: "Lumina Aurora X3D",
        shortDescription: "Ready-made premium gaming PC focused on FPS and low noise.",
        description: "A flagship prebuilt with a refined case, high-end parts and a polished premium profile.",
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
      ru: {
        title: "Техника, собранная без случайных компромиссов",
        subtitle: "Премиальный каталог компонентов, готовых ПК и периферии с реальными данными, локализациями и clean UX.",
        ctaLabel: "Перейти в каталог",
      },
      en: {
        title: "Tech assembled without accidental compromises",
        subtitle: "A premium catalog of components, prebuilt PCs and peripherals powered by real Prisma data and clean UX.",
        ctaLabel: "Browse catalog",
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
          label: getTechnicalAttributeLabel(definition, "en"),
          unit: definition.unit ?? null,
        },
        create: {
          code: definition.code,
          label: getTechnicalAttributeLabel(definition, "en"),
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
      defaultCurrency: "USD",
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
