export const locales = ["uk"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "uk";

export const inventoryLabels = {
  IN_STOCK: "В наявності",
  LOW_STOCK: "Закінчується",
  OUT_OF_STOCK: "Немає в наявності",
  PREORDER: "Передзамовлення",
} as const;
