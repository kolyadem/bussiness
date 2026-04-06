import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STOREFRONT_CURRENCY = "UAH";
const USD_TO_UAH_RATE = 41;

export const STOREFRONT_CURRENCY_CODE = STOREFRONT_CURRENCY;
export const STOREFRONT_USD_TO_UAH_RATE = USD_TO_UAH_RATE;

export function formatPrice(
  value: number,
  locale: string,
  currency: string = "USD",
) {
  const normalizedLocale =
    locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US";
  const amount =
    currency === STOREFRONT_CURRENCY
      ? value / 100
      : (value / 100) * USD_TO_UAH_RATE;

  return new Intl.NumberFormat(normalizedLocale, {
    style: "currency",
    currency: STOREFRONT_CURRENCY,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function displayPriceToStoredMinorUnits(value: number) {
  return Math.round((value * 100) / USD_TO_UAH_RATE);
}

export function storedMinorUnitsToDisplayPrice(value: number, currency: string = "USD") {
  return currency === STOREFRONT_CURRENCY ? value / 100 : (value / 100) * USD_TO_UAH_RATE;
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * URL slug: prefer ASCII `[a-z0-9]`; if that would be empty (e.g. Cyrillic-only name), keep Unicode letters/digits.
 */
export function slugify(value: string) {
  const normalized = value.toLowerCase().trim();
  const ascii = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (ascii.length >= 2) {
    return ascii;
  }
  return normalized
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

export function assertLocale(value: string): value is "uk" | "ru" | "en" {
  return ["uk", "ru", "en"].includes(value);
}
