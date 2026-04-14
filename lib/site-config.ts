import { cache } from "react";
import { db } from "@/lib/db";
import { normalizeSiteMode } from "@/lib/site-mode";

export { SITE_MODES, type SiteMode, isPcBuildSiteMode } from "@/lib/site-mode";

export const getSiteSettingsRecord = cache(async () => {
  try {
    return await db.siteSettings.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
    });
  } catch (error) {
    // Site settings are optional: never crash the storefront (missing table, wrong DATABASE_URL, driver quirks).
    if (process.env.NODE_ENV === "development") {
      console.warn("[site-config] SiteSettings query failed; using defaults.", error);
    }
    return null;
  }
});

export const getSiteMode = cache(async function getSiteMode() {
  const settings = await getSiteSettingsRecord();
  return normalizeSiteMode(settings?.siteMode);
});
