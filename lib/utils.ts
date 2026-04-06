import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STOREFRONT_CURRENCY = "UAH";
const USD_TO_UAH_RATE = 41;

/** User-facing and default catalog currency (ISO 4217). */
export const STOREFRONT_CURRENCY_CODE = STOREFRONT_CURRENCY;
/** Used when interpreting legacy rows stored as USD minor units (e.g. cents). */
export const STOREFRONT_USD_TO_UAH_RATE = USD_TO_UAH_RATE;

/**
 * Formats a stored integer amount for display in UAH (₴).
 * `value` is in minor units of `currency`: UAH = kopiyky; legacy USD = cents (converted for display).
 */
export function formatPrice(
  value: number,
  locale: string,
  currency: string = STOREFRONT_CURRENCY,
) {
  const normalizedLocale = "uk-UA";
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

/**
 * Converts a whole-number shelf price entered in UAH (грн) into stored minor units for `productCurrency`.
 * New data uses UAH (kopiyky). Legacy USD rows used USD cents derived from the same UAH display input.
 */
export function displayPriceToStoredMinorUnits(
  displayUah: number,
  productCurrency: string = STOREFRONT_CURRENCY,
) {
  if (productCurrency === STOREFRONT_CURRENCY) {
    return Math.round(displayUah * 100);
  }
  return Math.round((displayUah * 100) / USD_TO_UAH_RATE);
}

export function storedMinorUnitsToDisplayPrice(
  value: number,
  currency: string = STOREFRONT_CURRENCY,
) {
  return currency === STOREFRONT_CURRENCY
    ? value / 100
    : (value / 100) * USD_TO_UAH_RATE;
}

/** Sum stored minor units from different order currencies into a single UAH-kopecks total for reporting. */
export function storedMinorUnitsToUahKopecks(value: number, currency: string): number {
  if (currency === STOREFRONT_CURRENCY) {
    return value;
  }
  return Math.round(value * USD_TO_UAH_RATE);
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

export function assertLocale(value: string): value is "uk" {
  return value === "uk";
}
