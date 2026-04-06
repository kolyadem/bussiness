import { cache } from "react";
import { db } from "@/lib/db";
import { isPrismaRecoverableBuildTimeError } from "@/lib/prisma-build";
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
    if (isPrismaRecoverableBuildTimeError(error)) {
      return null;
    }
    throw error;
  }
});

export async function getSiteMode() {
  const settings = await getSiteSettingsRecord();
  return normalizeSiteMode(settings?.siteMode);
}
