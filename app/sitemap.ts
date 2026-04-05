import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { locales } from "@/lib/constants";
import {
  getAbsoluteUrl,
  getAlternateLanguageUrls,
  getLocalizedPath,
} from "@/lib/storefront/seo";

const publicRoutes = ["", "/catalog", "/configurator"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await db.product.findMany({
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

  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
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

  const productEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    products.map((product) => ({
      url: getAbsoluteUrl(getLocalizedPath(locale, `/product/${product.slug}`)),
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
      images: product.heroImage ? [getAbsoluteUrl(product.heroImage)] : undefined,
      alternates: {
        languages: getAlternateLanguageUrls(`/product/${product.slug}`),
      },
    })),
  );

  return [...staticEntries, ...productEntries];
}
