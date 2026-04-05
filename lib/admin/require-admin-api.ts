import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { canManageAdminPriceUpdates } from "@/lib/admin/permissions";

export function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Authentication required" : "Insufficient permissions",
    },
    { status },
  );
}

/** Same as imports: owner/admin-only API actions */
export async function requireOwnerAdminApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: jsonAuthError(401) } as const;
  }

  if (!hasRole(user.role, USER_ROLES.admin)) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}

/** Price updates API: ADMIN always; MANAGER only if User.canAccessPriceUpdates. */
export async function requirePriceUpdatesApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: jsonAuthError(401) } as const;
  }

  if (!canManageAdminPriceUpdates({ role: user.role, canAccessPriceUpdates: user.canAccessPriceUpdates })) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}
