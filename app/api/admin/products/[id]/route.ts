import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { canViewAdminFinancials } from "@/lib/admin";
import { isUniqueConstraintError, updateProductRecord, validateProductRelationTargets } from "@/lib/admin/product-persistence";
import { normalizeProductIngestPayload } from "@/lib/admin/product-ingest";

function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Потрібна автентифікація" : "Недостатньо прав",
    },
    { status },
  );
}

function formatValidationIssues(issues: Array<{ path?: PropertyKey[]; message: string }>) {
  return issues.map((issue) => ({
    path: Array.isArray(issue.path) ? issue.path.join(".") : "",
    message: issue.message,
  }));
}

async function requireAdminApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: jsonAuthError(401) } as const;
  }

  if (!hasRole(user.role, USER_ROLES.manager)) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;
  const existing = await db.product.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      brandId: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
  }

  const body = await request.json();
  const normalized = normalizeProductIngestPayload(body);

  if (!normalized.success) {
    return NextResponse.json(
      {
        error: "Некоректні дані товару",
        issues: formatValidationIssues(normalized.error.issues),
      },
      { status: 400 },
    );
  }

  normalized.data.brandId = existing.brandId;

  if (!canViewAdminFinancials(auth.user.role)) {
    const financialSnapshot = await db.product.findUnique({
      where: {
        id,
      },
      select: {
        purchasePrice: true,
      },
    });

    normalized.data.purchasePrice = financialSnapshot?.purchasePrice ?? null;
  }

  const relations = await validateProductRelationTargets(normalized.data);

  if (!relations.categoryExists) {
    return NextResponse.json(
      {
        error: "Категорію не знайдено",
        issues: [{ path: "categoryId", message: "Категорію не знайдено" }],
      },
      { status: 404 },
    );
  }

  try {
    await updateProductRecord(id, normalized.data);

    return NextResponse.json({
      ok: true,
      mode: "update",
      productId: id,
      slug: normalized.data.slug,
      sku: normalized.data.sku,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: "Slug або SKU мають бути унікальними",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Не вдалося оновити товар",
      },
      { status: 500 },
    );
  }
}
