import { slugify } from "@/lib/utils";
import type { AppLocale } from "@/lib/constants";
import { getConfiguratorSlotForCategorySlug } from "@/lib/configurator/technical-attributes";

export const CONFIGURATOR_ROUTE = "/configurator";

export const CONFIGURATOR_SLOT_ORDER = [
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "cooling",
  "case",
  "monitor",
  "keyboard",
  "mouse",
  "headset",
  "accessories",
] as const;

export type ConfiguratorSlotKey = (typeof CONFIGURATOR_SLOT_ORDER)[number];

type ConfiguratorSlotDefinition = {
  key: ConfiguratorSlotKey;
  group: "core" | "extras";
  categorySlugs: string[];
  includeKeywords?: string[];
  excludeKeywords?: string[];
};

const CONFIGURATOR_SLOT_DEFINITIONS: Record<ConfiguratorSlotKey, ConfiguratorSlotDefinition> = {
  cpu: { key: "cpu", group: "core", categorySlugs: ["processors"] },
  motherboard: { key: "motherboard", group: "core", categorySlugs: ["motherboards"] },
  ram: { key: "ram", group: "core", categorySlugs: ["memory"] },
  gpu: { key: "gpu", group: "core", categorySlugs: ["graphics-cards"] },
  storage: { key: "storage", group: "core", categorySlugs: ["storage"] },
  psu: { key: "psu", group: "core", categorySlugs: ["power-supplies", "power-supply-units", "psu"] },
  cooling: { key: "cooling", group: "core", categorySlugs: ["cooling", "coolers", "cpu-coolers"] },
  case: { key: "case", group: "core", categorySlugs: ["cases", "pc-cases", "computer-cases"] },
  monitor: { key: "monitor", group: "extras", categorySlugs: ["monitors"] },
  keyboard: {
    key: "keyboard",
    group: "extras",
    categorySlugs: ["peripherals"],
    includeKeywords: ["keyboard", "klav", "клав", "g915"],
  },
  mouse: {
    key: "mouse",
    group: "extras",
    categorySlugs: ["peripherals"],
    includeKeywords: ["mouse", "superlight", "мыш", "миша"],
  },
  headset: {
    key: "headset",
    group: "extras",
    categorySlugs: ["peripherals"],
    includeKeywords: ["headset", "headphone", "гарнит", "навуш"],
  },
  accessories: {
    key: "accessories",
    group: "extras",
    categorySlugs: ["peripherals"],
    excludeKeywords: [
      "keyboard",
      "klav",
      "клав",
      "g915",
      "mouse",
      "superlight",
      "мыш",
      "миша",
      "headset",
      "headphone",
      "гарнит",
      "навуш",
    ],
  },
};

const SLOT_LABELS: Record<ConfiguratorSlotKey, Record<AppLocale, string>> = {
  cpu: { uk: "Процесор" },
  motherboard: { uk: "Материнська плата" },
  ram: { uk: "Оперативна пам'ять" },
  gpu: { uk: "Відеокарта" },
  storage: { uk: "Накопичувач" },
  psu: { uk: "Блок живлення" },
  cooling: { uk: "Охолодження" },
  case: { uk: "Корпус" },
  monitor: { uk: "Монітор" },
  keyboard: { uk: "Клавіатура" },
  mouse: { uk: "Миша" },
  headset: { uk: "Гарнітура" },
  accessories: { uk: "Аксесуари" },
};

const SLOT_DESCRIPTIONS: Record<ConfiguratorSlotKey, Record<AppLocale, string>> = {
  cpu: {
    uk: "База збірки та відправна точка для подальшого вибору.",
  },
  motherboard: {
    uk: "Плата, що об'єднує всі ключові компоненти системи.",
  },
  ram: {
    uk: "Пам'ять для щоденної роботи, ігор і професійних задач.",
  },
  gpu: {
    uk: "Головний вибір для графіки, ігор та творчих навантажень.",
  },
  storage: {
    uk: "SSD або HDD для системи, бібліотеки ігор і проєктів.",
  },
  psu: {
    uk: "Живлення із запасом під обрану конфігурацію.",
  },
  cooling: {
    uk: "Повітряне або рідинне охолодження для стабільної температури.",
  },
  case: {
    uk: "Корпус, що визначає посадку компонентів і загальний характер збірки.",
  },
  monitor: {
    uk: "Дисплей для завершення робочого або ігрового сетапу.",
  },
  keyboard: {
    uk: "Клавіатура для щоденної роботи та ігрових сесій.",
  },
  mouse: {
    uk: "Точний контроль для роботи, ігор і творчих задач.",
  },
  headset: {
    uk: "Аудіо для зв'язку, занурення та стрімінгу.",
  },
  accessories: {
    uk: "Додаткові периферійні аксесуари навколо основного сетапу.",
  },
};

export function getConfiguratorSlots() {
  return CONFIGURATOR_SLOT_ORDER.map((slot) => CONFIGURATOR_SLOT_DEFINITIONS[slot]);
}

export function getConfiguratorSlotDefinition(slot: ConfiguratorSlotKey) {
  return CONFIGURATOR_SLOT_DEFINITIONS[slot];
}

export function isConfiguratorSlotKey(value: string): value is ConfiguratorSlotKey {
  return CONFIGURATOR_SLOT_ORDER.includes(value as ConfiguratorSlotKey);
}

export function getConfiguratorSlotLabel(slot: ConfiguratorSlotKey, locale: AppLocale) {
  return SLOT_LABELS[slot][locale];
}

export function getConfiguratorSlotDescription(slot: ConfiguratorSlotKey, locale: AppLocale) {
  return SLOT_DESCRIPTIONS[slot][locale];
}

export function getConfiguratorDefaultName(_locale: AppLocale) {
  return "Моя збірка ПК";
}

export function getConfiguratorUniqueBaseName(value: string, locale: AppLocale) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : getConfiguratorDefaultName(locale);
}

export function buildConfiguratorSlugCandidate(value: string, locale: AppLocale) {
  return slugify(getConfiguratorUniqueBaseName(value, locale)) || "pc-build";
}

export function matchConfiguratorSlotKeywords(
  slot: ConfiguratorSlotKey,
  localizedNames: string[],
  categorySlug: string,
) {
  const resolvedSlot = getConfiguratorSlotForCategorySlug(categorySlug);

  if (resolvedSlot) {
    return resolvedSlot === slot;
  }

  const definition = getConfiguratorSlotDefinition(slot);

  if (definition.categorySlugs.length > 0 && !definition.categorySlugs.includes(categorySlug)) {
    return false;
  }

  const haystack = localizedNames.join(" ").toLowerCase();

  if (definition.includeKeywords && !definition.includeKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  if (definition.excludeKeywords && definition.excludeKeywords.some((keyword) => haystack.includes(keyword))) {
    return false;
  }

  return true;
}

export function getConfiguratorShareHref(locale: AppLocale, shareToken: string) {
  return `/configurator/share/${shareToken}`;
}
