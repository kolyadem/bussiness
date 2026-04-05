import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { canViewAdminFinancials } from "@/lib/admin";
import { createProductRecord, isUniqueConstraintError, validateProductRelationTargets } from "@/lib/admin/product-persistence";
import { normalizeProductIngestPayload } from "@/lib/admin/product-ingest";

function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Authentication required" : "Insufficient permissions",
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

export async function POST(request: Request) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const body = await request.json();
  const normalized = normalizeProductIngestPayload(body);

  if (normalized.success && !canViewAdminFinancials(auth.user.role)) {
    normalized.data.purchasePrice = null;
  }

  if (!normalized.success) {
    return NextResponse.json(
      {
        error: "Invalid product payload",
        issues: formatValidationIssues(normalized.error.issues),
      },
      { status: 400 },
    );
  }

  const relations = await validateProductRelationTargets(normalized.data);

  if (!relations.brandExists || !relations.categoryExists) {
    return NextResponse.json(
      {
        error: "Brand or category was not found",
        issues: [
          ...(!relations.brandExists ? [{ path: "brandId", message: "Brand not found" }] : []),
          ...(!relations.categoryExists
            ? [{ path: "categoryId", message: "Category not found" }]
            : []),
        ],
      },
      { status: 404 },
    );
  }

  try {
    const product = await createProductRecord(normalized.data);

    return NextResponse.json(
      {
        ok: true,
        mode: "create",
        productId: product.id,
        slug: product.slug,
        sku: product.sku,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: "Slug or SKU must be unique",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to create product",
      },
      { status: 500 },
    );
  }
}
