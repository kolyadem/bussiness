import type { MetadataRoute } from "next";
import { locales } from "@/lib/constants";
import { getSiteUrl } from "@/lib/storefront/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const privateLocalizedPrefixes = locales.flatMap((locale) => [
    `/${locale}/admin`,
    `/${locale}/account`,
    `/${locale}/cart`,
    `/${locale}/wishlist`,
    `/${locale}/compare`,
    `/${locale}/checkout`,
    `/${locale}/login`,
    `/${locale}/configurator/select`,
    `/${locale}/configurator/share`,
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", ...privateLocalizedPrefixes],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
