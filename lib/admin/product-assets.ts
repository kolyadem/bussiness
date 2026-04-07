import path from "node:path";
import sharp from "sharp";
import { isManagedStoragePath, removeFileFromStorage, uploadFileToStorage } from "@/lib/storage";

const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_WIDTH_PX = 2000;

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
  const inputType = (file.type || "").toLowerCase();
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(inputType)) {
    throw new Error("IMAGE_TYPE_UNSUPPORTED");
  }

  const bytes = await file.arrayBuffer();
  const sourceBuffer = Buffer.from(bytes);

  try {
    let pipeline = sharp(sourceBuffer, { failOn: "error" }).rotate().resize({
      width: MAX_IMAGE_WIDTH_PX,
      withoutEnlargement: true,
    });

    let outputExtension = ".jpg";
    let outputType = "image/jpeg";

    if (inputType === "image/png") {
      pipeline = pipeline.png({
        compressionLevel: 0,
      });
      outputExtension = ".png";
      outputType = "image/png";
    } else if (inputType === "image/webp") {
      pipeline = pipeline.webp({
        quality: 95,
      });
      outputExtension = ".webp";
      outputType = "image/webp";
    } else {
      pipeline = pipeline.jpeg({
        quality: 95,
      });
      outputExtension = ".jpg";
      outputType = "image/jpeg";
    }

    const optimizedBuffer = await pipeline.toBuffer();
    return saveProductImageBuffer(optimizedBuffer, outputExtension, outputType);
  } catch (error) {
    console.error("[product-assets] Failed to optimize product image", {
      fileName: file.name,
      fileType: inputType,
      size: file.size,
      message: error instanceof Error ? error.message : String(error),
    });
    throw new Error("IMAGE_PROCESSING_FAILED");
  }
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
