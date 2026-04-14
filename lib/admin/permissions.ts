export const ADMIN_ROLE = "ADMIN";
export const MANAGER_ROLE = "MANAGER";
export const CUSTOMER_ROLE = "CUSTOMER";

export function canManageAdminUsers(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

export function canViewAdminFinancials(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

export function canManageAdminSettings(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

export function canManageAdminImports(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

export function canManageAdminBanners(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

export function canManagePromoCodes(role: string | null | undefined) {
  return role === ADMIN_ROLE;
}

export function canManageAdminCatalogTaxonomy(role: string | null | undefined) {
  return role === ADMIN_ROLE || role === MANAGER_ROLE;
}

/**
 * Price updates (preview / approve / apply / rollback): ADMIN always;
 * MANAGER only when `canAccessPriceUpdates` is true (see User model).
 */
export function canManageAdminPriceUpdates(user: {
  role: string | null | undefined;
  canAccessPriceUpdates?: boolean | null;
}): boolean {
  const { role, canAccessPriceUpdates } = user;
  if (role === ADMIN_ROLE) return true;
  if (role === MANAGER_ROLE && canAccessPriceUpdates === true) return true;
  return false;
}

export function getAdminCapabilities(
  role: string | null | undefined,
  options?: { canAccessPriceUpdates?: boolean | null },
) {
  return {
    canViewFinancials: canViewAdminFinancials(role),
    canManageUsers: canManageAdminUsers(role),
    canManageSettings: canManageAdminSettings(role),
    canManageImports: canManageAdminImports(role),
    canManageBanners: canManageAdminBanners(role),
    canManagePromoCodes: canManagePromoCodes(role),
    canManageCatalogTaxonomy: canManageAdminCatalogTaxonomy(role),
    canManagePriceUpdates: canManageAdminPriceUpdates({
      role,
      canAccessPriceUpdates: options?.canAccessPriceUpdates,
    }),
  };
}
