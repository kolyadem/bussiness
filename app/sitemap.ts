import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { isPrismaRecoverableBuildTimeError } from "@/lib/prisma-build";
import { defaultLocale } from "@/lib/constants";
import { getAbsoluteUrl, getLocalizedPath } from "@/lib/storefront/seo";

export const dynamic = "force-dynamic";

const publicRoutes = ["", "/catalog", "/configurator"] as const;

function buildStaticEntries(now: Date): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: getAbsoluteUrl(getLocalizedPath(defaultLocale, route)),
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/catalog" ? 0.9 : 0.8,
  }));
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

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: getAbsoluteUrl(getLocalizedPath(defaultLocale, `/product/${product.slug}`)),
    lastModified: product.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
    images: product.heroImage ? [getAbsoluteUrl(product.heroImage)] : undefined,
  }));

  return [...staticEntries, ...productEntries];
}
