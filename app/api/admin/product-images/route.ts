import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import {
  isManagedProductAssetPath,
  safeDeleteUploadedProductAsset,
  saveUploadedProductImage,
} from "@/lib/admin/product-assets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  if (!hasRole(user.role, USER_ROLES.manager)) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}

function isFile(input: FormDataEntryValue | null): input is File {
  return input instanceof File && input.size > 0;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter(isFile);

  if (files.length === 0) {
    return NextResponse.json({ error: "Файли не надіслано" }, { status: 400 });
  }

  const uploaded = await Promise.all(
    files.map(async (file) => ({
      path: await saveUploadedProductImage(file),
      originalName: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
    })),
  );

  return NextResponse.json({
    ok: true,
    files: uploaded,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const body = (await request.json().catch(() => null)) as { paths?: unknown } | null;
  const paths = Array.isArray(body?.paths)
    ? body.paths.map((value) => String(value ?? "").trim()).filter(Boolean)
    : [];

  if (paths.length === 0) {
    return NextResponse.json({ error: "Не вказано шляхи до файлів" }, { status: 400 });
  }

  const invalidPath = paths.find((assetPath) => !isManagedProductAssetPath(assetPath));

  if (invalidPath) {
    return NextResponse.json({ error: "Непідтримуваний шлях до файлу" }, { status: 400 });
  }

  await Promise.all(paths.map((assetPath) => safeDeleteUploadedProductAsset(assetPath)));

  return NextResponse.json({ ok: true });
}
