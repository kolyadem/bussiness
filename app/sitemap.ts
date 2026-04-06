import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { isPrismaRecoverableBuildTimeError } from "@/lib/prisma-build";
import { locales } from "@/lib/constants";
import {
  getAbsoluteUrl,
  getAlternateLanguageUrls,
  getLocalizedPath,
} from "@/lib/storefront/seo";

const publicRoutes = ["", "/catalog", "/configurator"] as const;

/**
 * Dynamic sitemap: generated per request; falls back to static routes if the DB is unavailable.
 * Product URLs are loaded when the DB is available; otherwise only public static routes are listed.
 */
export const dynamic = "force-dynamic";

function buildStaticEntries(now: Date): MetadataRoute.Sitemap {
  return locales.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: getAbsoluteUrl(getLocalizedPath(locale, route)),
      lastModified: now,
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1 : route === "/catalog" ? 0.9 : 0.8,
      alternates: {
        languages: getAlternateLanguageUrls(route),
      },
    })),
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries = buildStaticEntries(now);

  let products: Array<{ slug: string; heroImage: string; updatedAt: Date }> = [];
  try {
    products = await db.product.findMany({
      where: {
        status: "PUBLISHED",
      },
      select: {
        slug: true,
        heroImage: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  } catch (error) {
    if (isPrismaRecoverableBuildTimeError(error)) {
      return staticEntries;
    }
    throw error;
  }

  const productEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    products.map((product) => ({
      url: getAbsoluteUrl(getLocalizedPath(locale, `/product/${product.slug}`)),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      images: product.heroImage ? [getAbsoluteUrl(product.heroImage)] : undefined,
      alternates: {
        languages: getAlternateLanguageUrls(`/product/${product.slug}`),
      },
    })),
  );

  return [...staticEntries, ...productEntries];
}
