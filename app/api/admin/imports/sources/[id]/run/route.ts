import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { executeImportSourceConfig } from "@/lib/admin/imports/scheduler";

function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Authentication required" : "Insufficient permissions",
    },
    { status },
  );
}

async function requireAdminApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: jsonAuthError(401) } as const;
  }

  if (!hasRole(user.role, USER_ROLES.admin)) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const result = await executeImportSourceConfig({
    sourceConfigId: id,
    triggerType: "MANUAL",
    startedByUserId: auth.user.id,
    requireDue: false,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
