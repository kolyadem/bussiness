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
  cpu: { uk: "Процесор", ru: "Процессор", en: "CPU" },
  motherboard: { uk: "Материнська плата", ru: "Материнская плата", en: "Motherboard" },
  ram: { uk: "Оперативна пам'ять", ru: "Оперативная память", en: "RAM" },
  gpu: { uk: "Відеокарта", ru: "Видеокарта", en: "GPU" },
  storage: { uk: "Накопичувач", ru: "Накопитель", en: "Storage" },
  psu: { uk: "Блок живлення", ru: "Блок питания", en: "PSU" },
  cooling: { uk: "Охолодження", ru: "Охлаждение", en: "Cooling" },
  case: { uk: "Корпус", ru: "Корпус", en: "Case" },
  monitor: { uk: "Монітор", ru: "Монитор", en: "Monitor" },
  keyboard: { uk: "Клавіатура", ru: "Клавиатура", en: "Keyboard" },
  mouse: { uk: "Миша", ru: "Мышь", en: "Mouse" },
  headset: { uk: "Гарнітура", ru: "Гарнитура", en: "Headset" },
  accessories: { uk: "Аксесуари", ru: "Аксессуары", en: "Accessories" },
};

const SLOT_DESCRIPTIONS: Record<ConfiguratorSlotKey, Record<AppLocale, string>> = {
  cpu: {
    uk: "База збірки та відправна точка для подальшого вибору.",
    ru: "Основа сборки и отправная точка для дальнейшего выбора.",
    en: "The build foundation and the starting point for the rest.",
  },
  motherboard: {
    uk: "Плата, що об'єднує всі ключові компоненти системи.",
    ru: "Плата, которая объединяет все ключевые компоненты системы.",
    en: "The board that ties the key components together.",
  },
  ram: {
    uk: "Пам'ять для щоденної роботи, ігор і професійних задач.",
    ru: "Память для повседневной работы, игр и профессиональных задач.",
    en: "Memory for daily work, gaming, and productivity.",
  },
  gpu: {
    uk: "Головний вибір для графіки, ігор та творчих навантажень.",
    ru: "Ключевой выбор для графики, игр и творческих задач.",
    en: "The main choice for graphics, gaming, and creative workloads.",
  },
  storage: {
    uk: "SSD або HDD для системи, бібліотеки ігор і проєктів.",
    ru: "SSD или HDD для системы, библиотеки игр и проектов.",
    en: "SSD or HDD storage for the OS, games, and projects.",
  },
  psu: {
    uk: "Живлення із запасом під обрану конфігурацію.",
    ru: "Питание с запасом под выбранную конфигурацию.",
    en: "Power delivery sized for the chosen configuration.",
  },
  cooling: {
    uk: "Повітряне або рідинне охолодження для стабільної температури.",
    ru: "Воздушное или жидкостное охлаждение для стабильных температур.",
    en: "Air or liquid cooling for stable temperatures.",
  },
  case: {
    uk: "Корпус, що визначає посадку компонентів і загальний характер збірки.",
    ru: "Корпус, который определяет посадку компонентов и общий характер сборки.",
    en: "The chassis that shapes fitment and the look of the build.",
  },
  monitor: {
    uk: "Дисплей для завершення робочого або ігрового сетапу.",
    ru: "Дисплей для завершения рабочего или игрового сетапа.",
    en: "A display to complete the workstation or gaming setup.",
  },
  keyboard: {
    uk: "Клавіатура для щоденної роботи та ігрових сесій.",
    ru: "Клавиатура для ежедневной работы и игровых сессий.",
    en: "A keyboard for daily work and gaming sessions.",
  },
  mouse: {
    uk: "Точний контроль для роботи, ігор і творчих задач.",
    ru: "Точный контроль для работы, игр и творческих задач.",
    en: "Precise control for work, play, and creative tasks.",
  },
  headset: {
    uk: "Аудіо для зв'язку, занурення та стрімінгу.",
    ru: "Аудио для общения, погружения и стриминга.",
    en: "Audio for communication, immersion, and streaming.",
  },
  accessories: {
    uk: "Додаткові периферійні аксесуари навколо основного сетапу.",
    ru: "Дополнительные периферийные аксессуары вокруг основного сетапа.",
    en: "Extra accessories around the main setup.",
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

export function getConfiguratorDefaultName(locale: AppLocale) {
  return locale === "uk" ? "Моя збірка ПК" : locale === "ru" ? "Моя сборка ПК" : "My PC build";
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
  return `/${locale}/configurator/share/${shareToken}`;
}
