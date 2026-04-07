import { NextResponse } from "next/server";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import {
  isManagedProductAssetPath,
  safeDeleteUploadedProductAsset,
  saveUploadedProductImage,
} from "@/lib/admin/product-assets";
import { logEvent } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAllowedProductImage(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  return ALLOWED_IMAGE_TYPES.has(type);
}

function mapUploadFailure(error: unknown): { message: string; status: number } {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg === "STORAGE_BLOB_TOKEN_MISSING") {
    return {
      message:
        "Сховище зображень не налаштовано (немає токена Blob). Зверніться до адміністратора або використайте локальне сховище.",
      status: 503,
    };
  }
  if (msg.includes("EACCES") || msg.includes("EPERM")) {
    return {
      message: "Немає прав на запис у директорію завантажень на сервері.",
      status: 500,
    };
  }
  if (msg.includes("ENOENT")) {
    return {
      message: "Директорію для завантажень не знайдено або не вдалося створити.",
      status: 500,
    };
  }
  if (msg === "IMAGE_TYPE_UNSUPPORTED") {
    return {
      message: "Підтримуються лише формати JPEG, PNG або WebP.",
      status: 415,
    };
  }
  if (msg === "IMAGE_PROCESSING_FAILED") {
    return {
      message: "Файл не є валідним зображенням або пошкоджений.",
      status: 422,
    };
  }
  return {
    message: "Не вдалося зберегти файл на сервері. Спробуйте інший файл або повторіть пізніше.",
    status: 500,
  };
}

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("[product-images] Failed to parse multipart form data", error);
    return NextResponse.json({ error: "Не вдалося прочитати надіслані файли" }, { status: 400 });
  }

  const incomingFiles = formData.getAll("files").filter(isFile);
  const singleFile = formData.get("file");
  if (isFile(singleFile)) {
    incomingFiles.push(singleFile);
  }
  const files = incomingFiles.filter(
    (file, index, array) =>
      array.findIndex(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.type === file.type &&
          candidate.lastModified === file.lastModified,
      ) === index,
  );

  if (files.length === 0) {
    return NextResponse.json({ error: "Файли не надіслано (очікується поле file або files)" }, { status: 400 });
  }

  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `Файл занадто великий (максимум ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} МБ)` },
        { status: 413 },
      );
    }
    if (!isAllowedProductImage(file)) {
      return NextResponse.json(
        { error: "Підтримуються лише формати JPEG, PNG або WebP." },
        { status: 415 },
      );
    }
  }

  try {
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
  } catch (error) {
    console.error("[product-images] Upload failed", error);
    void logEvent("error", "admin product-images POST failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    const mapped = mapUploadFailure(error);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
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
