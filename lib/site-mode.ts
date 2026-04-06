export const SITE_MODES = {
  store: "STORE",
  pcBuild: "PC_BUILD",
} as const;

export type SiteMode = (typeof SITE_MODES)[keyof typeof SITE_MODES];

/** Default storefront experience: PC configurator / components for builds. Explicit `STORE` keeps classic catalog-first UX. */
export function normalizeSiteMode(value: string | null | undefined): SiteMode {
  return value === SITE_MODES.store ? SITE_MODES.store : SITE_MODES.pcBuild;
}

export function isPcBuildSiteMode(siteMode: SiteMode) {
  return siteMode === SITE_MODES.pcBuild;
}
