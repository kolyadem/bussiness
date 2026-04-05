export const SITE_MODES = {
  store: "STORE",
  pcBuild: "PC_BUILD",
} as const;

export type SiteMode = (typeof SITE_MODES)[keyof typeof SITE_MODES];

export function normalizeSiteMode(value: string | null | undefined): SiteMode {
  return value === SITE_MODES.pcBuild ? SITE_MODES.pcBuild : SITE_MODES.store;
}

export function isPcBuildSiteMode(siteMode: SiteMode) {
  return siteMode === SITE_MODES.pcBuild;
}
