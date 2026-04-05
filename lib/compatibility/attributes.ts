import type { CompatibilityProduct } from "@/lib/compatibility/types";

function normalizeTextValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : null;
}

function normalizeListValue(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter(Boolean)
    : [];
}

export function getCompatibilityString(
  product: CompatibilityProduct | null | undefined,
  code: string,
) {
  return normalizeTextValue(product?.technicalAttributes?.[code]);
}

export function getCompatibilityNumber(
  product: CompatibilityProduct | null | undefined,
  code: string,
) {
  const value = product?.technicalAttributes?.[code];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function getCompatibilityList(
  product: CompatibilityProduct | null | undefined,
  code: string,
) {
  return normalizeListValue(product?.technicalAttributes?.[code]);
}
