export const locales = ["uk", "ru", "en"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "uk";

export const localeLabels: Record<AppLocale, string> = {
  uk: "Українська",
  ru: "Русский",
  en: "English",
};

export const inventoryLabels = {
  IN_STOCK: {
    uk: "В наявності",
    ru: "В наличии",
    en: "In stock",
  },
  LOW_STOCK: {
    uk: "Закінчується",
    ru: "Заканчивается",
    en: "Low stock",
  },
  OUT_OF_STOCK: {
    uk: "Немає в наявності",
    ru: "Нет в наличии",
    en: "Out of stock",
  },
  PREORDER: {
    uk: "Передзамовлення",
    ru: "Предзаказ",
    en: "Preorder",
  },
} as const;
