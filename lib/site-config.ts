import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { normalizeSiteMode } from "@/lib/site-mode";

export { SITE_MODES, type SiteMode, isPcBuildSiteMode } from "@/lib/site-mode";

async function fetchSiteSettingsRecord() {
  try {
    return await db.siteSettings.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[site-config] SiteSettings query failed; using defaults.", error);
    }
    return null;
  }
}

/**
 * Fetch site settings with cross-request persistent caching.
 * Revalidates every 5 minutes; explicitly invalidated on admin save via
 * revalidateTag('site-settings').
 * Per-request deduplication via React.cache() on top.
 */
export const getSiteSettingsRecord = cache(
  unstable_cache(fetchSiteSettingsRecord, ["site-settings"], {
    tags: ["site-settings"],
    revalidate: 300,
  }),
);

export const getSiteMode = cache(async function getSiteMode() {
  const settings = await getSiteSettingsRecord();
  return normalizeSiteMode(settings?.siteMode);
});
