import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  nextSyncAt: z.string().trim().nullable().optional(),
});

function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Потрібна автентифікація" : "Недостатньо прав",
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
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  const nextSyncAtValue =
    typeof parsed.data.nextSyncAt === "string" && parsed.data.nextSyncAt.trim().length > 0
      ? new Date(parsed.data.nextSyncAt)
      : parsed.data.nextSyncAt === null
        ? null
        : undefined;

  if (
    nextSyncAtValue instanceof Date &&
    Number.isNaN(nextSyncAtValue.getTime())
  ) {
    return NextResponse.json({ error: "Некоректна дата nextSyncAt" }, { status: 400 });
  }

  try {
    const source = await db.importSourceConfig.update({
      where: {
        id,
      },
      data: {
        ...(typeof parsed.data.isActive === "boolean" ? { isActive: parsed.data.isActive } : {}),
        ...(nextSyncAtValue !== undefined ? { nextSyncAt: nextSyncAtValue } : {}),
        updatedByUserId: auth.user.id,
      },
      select: {
        id: true,
        isActive: true,
        nextSyncAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      source,
    });
  } catch {
    return NextResponse.json({ error: "Не вдалося оновити конфігурацію джерела" }, { status: 400 });
  }
}
