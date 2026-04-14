/** Fallback when heroImage is missing or blank (public asset must exist). */
export const PRODUCT_IMAGE_FALLBACK = "/products/peripheral.svg";

export function resolveHeroImageSrc(src: string | null | undefined): string {
  if (typeof src !== "string") {
    return PRODUCT_IMAGE_FALLBACK;
  }

  const trimmed = src.trim();

  if (trimmed.length === 0) {
    return PRODUCT_IMAGE_FALLBACK;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }

  /** Without a leading slash, `/uk/configurator` would resolve `products/x.svg` → `/uk/products/...` (404). */
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
