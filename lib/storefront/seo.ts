import type { Metadata } from "next";
import { messages, type MessageKey } from "@/lib/i18n/messages";
import { defaultLocale, type AppLocale } from "@/lib/constants";

const fallbackSiteName = "Lumina Tech";

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizePathname(pathname: string) {
  if (!pathname || pathname === "/") {
    return "";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

/** Legacy paths like `/uk/catalog` — first segment was a locale. Unprefixed routes return null. */
export function resolveLocaleFromPathname(pathname: string | null | undefined): AppLocale | null {
  if (!pathname) {
    return null;
  }

  const normalizedPathname = pathname.startsWith("http")
    ? new URL(pathname).pathname
    : pathname;
  const [segment] = normalizedPathname.split("/").filter(Boolean);

  if (segment === "uk") {
    return defaultLocale;
  }

  return null;
}

export function getSiteUrl() {
  return normalizeBaseUrl(
    process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.AUTH_URL ??
      process.env.NEXTAUTH_URL ??
      "http://localhost:3000",
  );
}

export function getMetadataBase() {
  return new URL(getSiteUrl());
}

/** Public URL path without locale prefix (Ukrainian-only site). */
export function getLocalizedPath(_locale: AppLocale, pathname: string) {
  return normalizePathname(pathname);
}

export function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, getMetadataBase()).toString();
}

export function getAbsoluteLocalizedUrl(_locale: AppLocale, pathname: string) {
  return getAbsoluteUrl(getLocalizedPath(defaultLocale, pathname));
}

export function getOpenGraphLocale(_locale: AppLocale) {
  return "uk_UA";
}

export function getAlternateLanguageUrls(pathname: string) {
  return {
    uk: getAbsoluteLocalizedUrl(defaultLocale, pathname),
  } as const;
}

export function buildAlternates(pathname: string, _locale: AppLocale): Metadata["alternates"] {
  return {
    canonical: getAbsoluteLocalizedUrl(defaultLocale, pathname),
    languages: {
      uk: getAbsoluteLocalizedUrl(defaultLocale, pathname),
    },
  };
}

export function buildRobots(indexable = true): Metadata["robots"] {
  if (indexable) {
    return {
      index: true,
      follow: true,
    };
  }

  return {
    index: false,
    follow: false,
    nocache: true,
  };
}

export function pageMetadata(
  locale: AppLocale,
  titleKey: MessageKey,
  description: string,
  pathname: string,
  options?: {
    title?: string;
    indexable?: boolean;
    images?: string[];
    type?: "website" | "article";
    siteName?: string;
  },
): Metadata {
  const title = options?.title ?? messages[titleKey];
  const siteName = options?.siteName ?? fallbackSiteName;
  const pageUrl = getAbsoluteLocalizedUrl(locale, pathname);
  const images = options?.images?.map((image) =>
    image.startsWith("http") ? image : getAbsoluteUrl(image),
  );

  return {
    title,
    description,
    alternates: buildAlternates(pathname, locale),
    robots: buildRobots(options?.indexable ?? true),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName,
      locale: getOpenGraphLocale(locale),
      type: options?.type ?? "website",
      ...(images && images.length > 0 ? { images } : {}),
    },
    twitter: {
      card: images && images.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      ...(images && images.length > 0 ? { images } : {}),
    },
  };
}

export function sanitizeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
