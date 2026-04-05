import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { acknowledgeImportAlert } from "@/lib/admin/imports/alerts";

const patchSchema = z.object({
  action: z.enum(["acknowledge"]),
});

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const alert = await acknowledgeImportAlert({
      id,
      userId: auth.user.id,
    });

    return NextResponse.json({
      ok: true,
      alert,
    });
  } catch {
    return NextResponse.json({ error: "Could not update alert" }, { status: 400 });
  }
}
