import type { AppLocale } from "@/lib/constants";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";

type TechnicalFieldType = "text" | "number" | "list";

type TechnicalAttributeDefinition = {
  code: string;
  slot: ConfiguratorSlotKey;
  fieldType: TechnicalFieldType;
  unit?: string;
  categorySlugs: string[];
  label: Record<AppLocale, string>;
  placeholder: Record<AppLocale, string>;
  hint?: Record<AppLocale, string>;
};

type ProductTechnicalSource = {
  category?: { slug: string } | null;
  attributes?: Array<{
    attribute: {
      code: string;
    };
    value: string;
  }>;
  wattage?: number | null;
  tdp?: number | null;
  lengthMm?: number | null;
  maxGpuLengthMm?: number | null;
  coolerHeightMm?: number | null;
  maxCoolerMm?: number | null;
  memoryType?: string | null;
  socket?: string | null;
  formFactor?: string | null;
  supportedSockets?: string | null;
  memoryCapacityGb?: number | null;
  memorySpeedMhz?: number | null;
  storageInterface?: string | null;
};

export const CONFIGURATOR_CATEGORY_SLOT_MAP: Partial<Record<string, ConfiguratorSlotKey>> = {
  // CPU
  processors: "cpu",
  cpus: "cpu",
  "central-processing-units": "cpu",
  // Motherboard
  motherboards: "motherboard",
  "main-boards": "motherboard",
  // RAM
  memory: "ram",
  ram: "ram",
  "ddr-memory": "ram",
  "ddr4-memory": "ram",
  "ddr5-memory": "ram",
  // GPU
  "graphics-cards": "gpu",
  "video-cards": "gpu",
  gpus: "gpu",
  // Storage — all common slugs for SSD, HDD, NVMe
  storage: "storage",
  ssd: "storage",
  hdd: "storage",
  ssds: "storage",
  hdds: "storage",
  "ssd-drives": "storage",
  "hdd-drives": "storage",
  "solid-state-drives": "storage",
  "hard-drives": "storage",
  "hard-disk-drives": "storage",
  drives: "storage",
  накопичувачі: "storage",
  // PSU
  "power-supplies": "psu",
  "power-supply-units": "psu",
  psu: "psu",
  "power-supply": "psu",
  // Cooling
  cooling: "cooling",
  coolers: "cooling",
  "cpu-coolers": "cooling",
  "cpu-cooling": "cooling",
  "water-cooling": "cooling",
  "liquid-cooling": "cooling",
  fans: "cooling",
  // Case
  cases: "case",
  "pc-cases": "case",
  "computer-cases": "case",
  "system-cases": "case",
  "pc-towers": "case",
  корпуси: "case",
  // Monitor
  monitors: "monitor",
  displays: "monitor",
  "gaming-monitors": "monitor",
  монітори: "monitor",
  // Keyboard — specific category slugs
  keyboards: "keyboard",
  "mechanical-keyboards": "keyboard",
  "gaming-keyboards": "keyboard",
  клавіатури: "keyboard",
  // Mouse — specific category slugs
  mice: "mouse",
  "computer-mice": "mouse",
  "gaming-mice": "mouse",
  мишки: "mouse",
  миші: "mouse",
  // Headset — specific category slugs
  headsets: "headset",
  headphones: "headset",
  "gaming-headsets": "headset",
  гарнітури: "headset",
  навушники: "headset",
  // Accessories
  accessories: "accessories",
  "pc-accessories": "accessories",
  аксесуари: "accessories",
};

const TECHNICAL_ATTRIBUTE_DEFINITIONS: readonly TechnicalAttributeDefinition[] = [
  {
    code: "cpu.socket",
    slot: "cpu",
    fieldType: "text",
    categorySlugs: ["processors"],
    label: { uk: "Сокет" },
    placeholder: { uk: "Наприклад: AM5" },
  },
  {
    code: "cpu.platform",
    slot: "cpu",
    fieldType: "text",
    categorySlugs: ["processors"],
    label: { uk: "Платформа / покоління" },
    placeholder: {
      uk: "Наприклад: Ryzen 7000",
    },
  },
  {
    code: "cpu.tdp",
    slot: "cpu",
    fieldType: "number",
    unit: "W",
    categorySlugs: ["processors"],
    label: { uk: "TDP" },
    placeholder: { uk: "120" },
  },
  {
    code: "motherboard.socket",
    slot: "motherboard",
    fieldType: "text",
    categorySlugs: ["motherboards"],
    label: { uk: "Сокет" },
    placeholder: { uk: "Наприклад: AM5" },
  },
  {
    code: "motherboard.chipset",
    slot: "motherboard",
    fieldType: "text",
    categorySlugs: ["motherboards"],
    label: { uk: "Чипсет" },
    placeholder: { uk: "Наприклад: B650E" },
  },
  {
    code: "motherboard.memory_type",
    slot: "motherboard",
    fieldType: "text",
    categorySlugs: ["motherboards"],
    label: { uk: "Тип пам'яті" },
    placeholder: { uk: "DDR5" },
  },
  {
    code: "motherboard.form_factor",
    slot: "motherboard",
    fieldType: "text",
    categorySlugs: ["motherboards"],
    label: { uk: "Форм-фактор" },
    placeholder: { uk: "ATX" },
  },
  {
    code: "ram.memory_type",
    slot: "ram",
    fieldType: "text",
    categorySlugs: ["memory"],
    label: { uk: "Тип пам'яті" },
    placeholder: { uk: "DDR5" },
  },
  {
    code: "ram.speed_mhz",
    slot: "ram",
    fieldType: "number",
    unit: "MHz",
    categorySlugs: ["memory"],
    label: { uk: "Швидкість" },
    placeholder: { uk: "6000" },
  },
  {
    code: "ram.capacity_gb",
    slot: "ram",
    fieldType: "number",
    unit: "GB",
    categorySlugs: ["memory"],
    label: { uk: "Обсяг" },
    placeholder: { uk: "32" },
  },
  {
    code: "gpu.length_mm",
    slot: "gpu",
    fieldType: "number",
    unit: "mm",
    categorySlugs: ["graphics-cards"],
    label: { uk: "Довжина" },
    placeholder: { uk: "300" },
  },
  {
    code: "gpu.power_draw_w",
    slot: "gpu",
    fieldType: "number",
    unit: "W",
    categorySlugs: ["graphics-cards"],
    label: { uk: "Споживання" },
    placeholder: { uk: "285" },
  },
  {
    code: "gpu.recommended_psu_w",
    slot: "gpu",
    fieldType: "number",
    unit: "W",
    categorySlugs: ["graphics-cards"],
    label: { uk: "Рекомендований БЖ" },
    placeholder: { uk: "750" },
  },
  {
    code: "case.supported_form_factors",
    slot: "case",
    fieldType: "list",
    categorySlugs: ["cases", "pc-cases", "computer-cases"],
    label: { uk: "Підтримувані форм-фактори" },
    placeholder: {
      uk: "ATX, Micro-ATX, Mini-ITX",
    },
    hint: {
      uk: "Перелічіть значення через кому.",
    },
  },
  {
    code: "case.max_gpu_length_mm",
    slot: "case",
    fieldType: "number",
    unit: "mm",
    categorySlugs: ["cases", "pc-cases", "computer-cases"],
    label: { uk: "Макс. довжина GPU" },
    placeholder: { uk: "360" },
  },
  {
    code: "case.max_cooler_height_mm",
    slot: "case",
    fieldType: "number",
    unit: "mm",
    categorySlugs: ["cases", "pc-cases", "computer-cases"],
    label: { uk: "Макс. висота кулера" },
    placeholder: { uk: "170" },
  },
  {
    code: "cooler.supported_sockets",
    slot: "cooling",
    fieldType: "list",
    categorySlugs: ["cooling", "coolers", "cpu-coolers"],
    label: { uk: "Підтримувані сокети" },
    placeholder: { uk: "AM5, LGA1700" },
    hint: {
      uk: "Перелічіть значення через кому.",
    },
  },
  {
    code: "cooler.height_mm",
    slot: "cooling",
    fieldType: "number",
    unit: "mm",
    categorySlugs: ["cooling", "coolers", "cpu-coolers"],
    label: { uk: "Висота" },
    placeholder: { uk: "158" },
  },
  {
    code: "psu.wattage",
    slot: "psu",
    fieldType: "number",
    unit: "W",
    categorySlugs: ["power-supplies", "power-supply-units", "psu"],
    label: { uk: "Потужність" },
    placeholder: { uk: "850" },
  },
  {
    code: "storage.interface",
    slot: "storage",
    fieldType: "text",
    categorySlugs: ["storage"],
    label: { uk: "Інтерфейс" },
    placeholder: { uk: "PCIe 4.0 NVMe" },
  },
  {
    code: "storage.form_factor",
    slot: "storage",
    fieldType: "text",
    categorySlugs: ["storage"],
    label: { uk: "Форм-фактор" },
    placeholder: { uk: "M.2 2280" },
  },
] as const;

const TECHNICAL_ATTRIBUTE_DEFINITION_MAP = new Map(
  TECHNICAL_ATTRIBUTE_DEFINITIONS.map((definition) => [definition.code, definition] as const),
);

function normalizeListValues(value: string) {
  const normalized = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function parseStoredListValue(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to delimited parsing.
  }

  return normalizeListValues(value);
}

function getFallbackTechnicalAttributeValues(
  source: ProductTechnicalSource,
  categorySlug: string | null,
) {
  const values: Record<string, string> = {};
  const slot = categorySlug ? CONFIGURATOR_CATEGORY_SLOT_MAP[categorySlug] ?? null : null;

  if (slot === "cpu") {
    if (source.socket) {
      values["cpu.socket"] = source.socket;
    }
    if (typeof source.tdp === "number") {
      values["cpu.tdp"] = String(source.tdp);
    }
  }

  if (slot === "motherboard") {
    if (source.socket) {
      values["motherboard.socket"] = source.socket;
    }
    if (source.memoryType) {
      values["motherboard.memory_type"] = source.memoryType;
    }
    if (source.formFactor) {
      values["motherboard.form_factor"] = source.formFactor;
    }
  }

  if (slot === "ram") {
    if (source.memoryType) {
      values["ram.memory_type"] = source.memoryType;
    }
    if (typeof source.memorySpeedMhz === "number") {
      values["ram.speed_mhz"] = String(source.memorySpeedMhz);
    }
    if (typeof source.memoryCapacityGb === "number") {
      values["ram.capacity_gb"] = String(source.memoryCapacityGb);
    }
  }

  if (slot === "gpu" && typeof source.lengthMm === "number") {
    values["gpu.length_mm"] = String(source.lengthMm);
  }

  if (slot === "case") {
    if (typeof source.maxGpuLengthMm === "number") {
      values["case.max_gpu_length_mm"] = String(source.maxGpuLengthMm);
    }
    if (typeof source.maxCoolerMm === "number") {
      values["case.max_cooler_height_mm"] = String(source.maxCoolerMm);
    } else if (typeof source.coolerHeightMm === "number") {
      values["case.max_cooler_height_mm"] = String(source.coolerHeightMm);
    }
  }

  if (slot === "cooling") {
    if (source.supportedSockets) {
      values["cooler.supported_sockets"] = JSON.stringify(parseStoredListValue(source.supportedSockets));
    }
    if (typeof source.coolerHeightMm === "number") {
      values["cooler.height_mm"] = String(source.coolerHeightMm);
    }
  }

  if (slot === "psu" && typeof source.wattage === "number") {
    values["psu.wattage"] = String(source.wattage);
  }

  if (slot === "storage") {
    if (source.storageInterface) {
      values["storage.interface"] = source.storageInterface;
    }
    if (source.formFactor) {
      values["storage.form_factor"] = source.formFactor;
    }
  }

  return values;
}

export function getAllTechnicalAttributeDefinitions() {
  return [...TECHNICAL_ATTRIBUTE_DEFINITIONS];
}

export function getTechnicalAttributeDefinition(code: string) {
  return TECHNICAL_ATTRIBUTE_DEFINITION_MAP.get(code) ?? null;
}

export function getTechnicalAttributeDefinitionsForCategorySlug(categorySlug: string | null | undefined) {
  if (!categorySlug) {
    return [];
  }

  return TECHNICAL_ATTRIBUTE_DEFINITIONS.filter((definition) =>
    definition.categorySlugs.includes(categorySlug),
  );
}

/** Короткі підказки для вільних характеристик (ключ/значення) за категорією. */
export function getSpecSuggestionLabelsForCategorySlug(
  categorySlug: string | null | undefined,
  locale: AppLocale,
  max = 6,
): string[] {
  return getTechnicalAttributeDefinitionsForCategorySlug(categorySlug)
    .slice(0, max)
    .map((definition) => getTechnicalAttributeLabel(definition, locale));
}

export function getTechnicalAttributeLabel(
  definition: TechnicalAttributeDefinition,
  locale: AppLocale,
) {
  return definition.label[locale];
}

export function getTechnicalAttributePlaceholder(
  definition: TechnicalAttributeDefinition,
  locale: AppLocale,
) {
  return definition.placeholder[locale];
}

export function getTechnicalAttributeHint(
  definition: TechnicalAttributeDefinition,
  locale: AppLocale,
) {
  return definition.hint?.[locale] ?? null;
}

export function getConfiguratorSlotForCategorySlug(categorySlug: string | null | undefined) {
  if (!categorySlug) {
    return null;
  }

  return CONFIGURATOR_CATEGORY_SLOT_MAP[categorySlug] ?? null;
}

export function normalizeTechnicalAttributeInput(
  definition: TechnicalAttributeDefinition,
  rawValue: string,
) {
  const trimmed = rawValue.trim();

  if (trimmed.length === 0) {
    return {
      success: true as const,
      value: null,
    };
  }

  if (definition.fieldType === "list") {
    return {
      success: true as const,
      value: JSON.stringify(normalizeListValues(trimmed)),
    };
  }

  if (definition.fieldType === "number") {
    const numeric = Number(trimmed.replace(",", "."));

    if (!Number.isFinite(numeric) || numeric < 0) {
      return {
        success: false as const,
      };
    }

    return {
      success: true as const,
      value: numeric.toString(),
    };
  }

  return {
    success: true as const,
    value: trimmed,
  };
}

export function formatTechnicalAttributeInputValue(
  definition: TechnicalAttributeDefinition,
  storedValue: string,
) {
  if (!storedValue) {
    return "";
  }

  if (definition.fieldType === "list") {
    return parseStoredListValue(storedValue).join(", ");
  }

  return storedValue;
}

export function parseTechnicalAttributeValue(
  definition: TechnicalAttributeDefinition,
  storedValue: string,
) {
  if (definition.fieldType === "list") {
    return parseStoredListValue(storedValue);
  }

  if (definition.fieldType === "number") {
    const numeric = Number(storedValue);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return storedValue;
}

export function getTechnicalAttributeInputMap(source: ProductTechnicalSource) {
  const categorySlug = source.category?.slug ?? null;
  const values = getFallbackTechnicalAttributeValues(source, categorySlug);

  for (const item of source.attributes ?? []) {
    if (!TECHNICAL_ATTRIBUTE_DEFINITION_MAP.has(item.attribute.code)) {
      continue;
    }

    values[item.attribute.code] = item.value;
  }

  return Object.fromEntries(
    Object.entries(values).map(([code, value]) => {
      const definition = TECHNICAL_ATTRIBUTE_DEFINITION_MAP.get(code)!;
      return [code, formatTechnicalAttributeInputValue(definition, value)];
    }),
  ) as Record<string, string>;
}

export function getNormalizedTechnicalAttributeMap(source: ProductTechnicalSource) {
  const categorySlug = source.category?.slug ?? null;
  const values = getFallbackTechnicalAttributeValues(source, categorySlug);

  for (const item of source.attributes ?? []) {
    if (!TECHNICAL_ATTRIBUTE_DEFINITION_MAP.has(item.attribute.code)) {
      continue;
    }

    values[item.attribute.code] = item.value;
  }

  return Object.fromEntries(
    Object.entries(values).flatMap(([code, value]) => {
      const definition = TECHNICAL_ATTRIBUTE_DEFINITION_MAP.get(code);

      if (!definition) {
        return [];
      }

      const parsed = parseTechnicalAttributeValue(definition, value);
      return parsed === null ? [] : [[code, parsed] as const];
    }),
  ) as Record<string, number | string | string[]>;
}

export function buildTechnicalScalarFields(technicalAttributes: Record<string, string>) {
  return {
    wattage:
      typeof technicalAttributes["psu.wattage"] === "string"
        ? Number(technicalAttributes["psu.wattage"])
        : null,
    tdp:
      typeof technicalAttributes["cpu.tdp"] === "string"
        ? Number(technicalAttributes["cpu.tdp"])
        : null,
    lengthMm:
      typeof technicalAttributes["gpu.length_mm"] === "string"
        ? Number(technicalAttributes["gpu.length_mm"])
        : null,
    maxGpuLengthMm:
      typeof technicalAttributes["case.max_gpu_length_mm"] === "string"
        ? Number(technicalAttributes["case.max_gpu_length_mm"])
        : null,
    coolerHeightMm:
      typeof technicalAttributes["cooler.height_mm"] === "string"
        ? Number(technicalAttributes["cooler.height_mm"])
        : null,
    maxCoolerMm:
      typeof technicalAttributes["case.max_cooler_height_mm"] === "string"
        ? Number(technicalAttributes["case.max_cooler_height_mm"])
        : null,
    memoryType:
      technicalAttributes["motherboard.memory_type"] ??
      technicalAttributes["ram.memory_type"] ??
      null,
    socket:
      technicalAttributes["cpu.socket"] ?? technicalAttributes["motherboard.socket"] ?? null,
    formFactor:
      technicalAttributes["motherboard.form_factor"] ??
      technicalAttributes["storage.form_factor"] ??
      null,
    supportedSockets: technicalAttributes["cooler.supported_sockets"] ?? null,
    memoryCapacityGb:
      typeof technicalAttributes["ram.capacity_gb"] === "string"
        ? Number(technicalAttributes["ram.capacity_gb"])
        : null,
    memorySpeedMhz:
      typeof technicalAttributes["ram.speed_mhz"] === "string"
        ? Number(technicalAttributes["ram.speed_mhz"])
        : null,
    psuFormFactor: null,
    storageInterface: technicalAttributes["storage.interface"] ?? null,
  };
}
