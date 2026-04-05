import type { Metadata } from "next";
import { messages } from "@/lib/i18n/messages";
import { defaultLocale, locales, type AppLocale } from "@/lib/constants";

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

export function resolveLocaleFromPathname(pathname: string | null | undefined) {
  if (!pathname) {
    return null;
  }

  const normalizedPathname = pathname.startsWith("http")
    ? new URL(pathname).pathname
    : pathname;
  const [segment] = normalizedPathname.split("/").filter(Boolean);

  return locales.includes(segment as AppLocale) ? (segment as AppLocale) : null;
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

export function getLocalizedPath(locale: AppLocale, pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return normalizedPathname ? `/${locale}${normalizedPathname}` : `/${locale}`;
}

export function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, getMetadataBase()).toString();
}

export function getAbsoluteLocalizedUrl(locale: AppLocale, pathname: string) {
  return getAbsoluteUrl(getLocalizedPath(locale, pathname));
}

export function getOpenGraphLocale(locale: AppLocale) {
  switch (locale) {
    case "uk":
      return "uk_UA";
    case "ru":
      return "ru_RU";
    case "en":
    default:
      return "en_US";
  }
}

export function getAlternateLanguageUrls(pathname: string) {
  return Object.fromEntries(
    locales.map((supportedLocale) => [
      supportedLocale,
      getAbsoluteLocalizedUrl(supportedLocale, pathname),
    ]),
  ) as Record<AppLocale, string>;
}

export function buildAlternates(pathname: string, locale: AppLocale): Metadata["alternates"] {
  const languages = getAlternateLanguageUrls(pathname);

  return {
    canonical: getAbsoluteLocalizedUrl(locale, pathname),
    languages: {
      ...languages,
      "x-default": getAbsoluteLocalizedUrl(defaultLocale, pathname),
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
  titleKey: keyof (typeof messages)["en"],
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
  const title = options?.title ?? messages[locale][titleKey];
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
