import { cache } from "react";
import { db } from "@/lib/db";
import { normalizeSiteMode } from "@/lib/site-mode";

export { SITE_MODES, type SiteMode, isPcBuildSiteMode } from "@/lib/site-mode";

export const getSiteSettingsRecord = cache(async () => {
  return db.siteSettings.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
  });
});

export async function getSiteMode() {
  const settings = await getSiteSettingsRecord();
  return normalizeSiteMode(settings?.siteMode);
}
