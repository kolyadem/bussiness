import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ToastProvider } from "@/components/providers/toast-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { defaultLocale, locales, type AppLocale } from "@/lib/constants";
import { StorefrontShell } from "@/components/layout/storefront-shell";
import { getSiteSettings } from "@/lib/storefront/queries";
import {
  buildAlternates,
  buildRobots,
  getAbsoluteUrl,
  getMetadataBase,
  getOpenGraphLocale,
  getAbsoluteLocalizedUrl,
} from "@/lib/storefront/seo";

/** Avoid build-time Prisma calls when DATABASE_URL points at an empty/unmigrated DB (e.g. Vercel). */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings();
  const siteName = settings?.brandName || "Lumina Tech";
  const description = settings?.metaDescription || "Premium electronics store";
  const logoPath = settings?.logoPath || settings?.faviconPath || "/favicon.ico";
  const socialImages = [getAbsoluteUrl(logoPath)];

  return {
    metadataBase: getMetadataBase(),
    applicationName: siteName,
    title: {
      default: settings?.metaTitle || siteName,
      template: `%s | ${siteName}`,
    },
    description,
    alternates: buildAlternates("", locale),
    robots: buildRobots(true),
    openGraph: {
      title: settings?.metaTitle || siteName,
      description,
      url: getAbsoluteLocalizedUrl(locale, ""),
      siteName,
      locale: getOpenGraphLocale(locale),
      type: "website",
      images: socialImages,
    },
    twitter: {
      card: "summary_large_image",
      title: settings?.metaTitle || siteName,
      description,
      images: socialImages,
    },
    icons: settings?.faviconPath
      ? {
          icon: settings.faviconPath,
          shortcut: settings.faviconPath,
          apple: settings.faviconPath,
        }
      : undefined,
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  setRequestLocale(locale ?? defaultLocale);

  const messages = await getMessages();

  return (
    <ThemeProvider>
      <NextIntlClientProvider messages={messages} locale={locale}>
        <StorefrontShell locale={locale as (typeof locales)[number]}>
          {children}
        </StorefrontShell>
        <ToastProvider />
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
