import path from "node:path";
import { isManagedStoragePath, removeFileFromStorage, uploadFileToStorage } from "@/lib/storage";

async function saveProductImageBuffer(
  buffer: Buffer,
  extension: string,
  contentType?: string | null,
) {
  const uploaded = await uploadFileToStorage({
    buffer,
    fileName: `product${extension}`,
    contentType,
  });

  return uploaded.path;
}

export async function saveUploadedProductImage(file: File) {
  const extension = path.extname(file.name || "").toLowerCase() || ".bin";
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveProductImageBuffer(buffer, extension, file.type || "application/octet-stream");
}

function resolveRemoteImageExtension(url: string, contentType: string | null) {
  const pathExtension = path.extname(new URL(url).pathname).toLowerCase();

  if (pathExtension) {
    return pathExtension;
  }

  if (contentType?.includes("png")) {
    return ".png";
  }

  if (contentType?.includes("webp")) {
    return ".webp";
  }

  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return ".jpg";
  }

  return ".bin";
}

export async function downloadRemoteProductImage(
  imageUrl: string,
  options?: {
    timeoutMs?: number;
    maxBytes?: number;
  },
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 15000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      throw new Error(`Image fetch failed with ${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    const maxBytes = options?.maxBytes ?? 5_242_880;

    if (contentLength > maxBytes) {
      throw new Error("Image exceeds size limit");
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > maxBytes) {
      throw new Error("Image exceeds size limit");
    }

    const extension = resolveRemoteImageExtension(imageUrl, response.headers.get("content-type"));
    return saveProductImageBuffer(buffer, extension, response.headers.get("content-type"));
  } finally {
    clearTimeout(timeout);
  }
}

export function isManagedProductAssetPath(
  assetPath: string | null | undefined,
): assetPath is string {
  return isManagedStoragePath(assetPath);
}

export async function safeDeleteUploadedProductAsset(assetPath: string | null | undefined) {
  await removeFileFromStorage(assetPath);
}
