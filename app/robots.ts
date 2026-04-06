import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/storefront/seo";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const privatePrefixes = [
    "/admin",
    "/account",
    "/cart",
    "/wishlist",
    "/compare",
    "/checkout",
    "/login",
    "/configurator/select",
    "/configurator/share",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api", ...privatePrefixes],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
