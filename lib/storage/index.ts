import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { logEvent } from "@/lib/observability/logger";

export type StorageUploadInput = {
  buffer: Buffer;
  fileName?: string;
  contentType?: string | null;
  folder?: string;
};

export type StorageUploadResult = {
  path: string;
  publicUrl: string;
};

type StorageDriver = {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  remove(assetPath: string): Promise<void>;
  isManagedPath(assetPath: string | null | undefined): assetPath is string;
};

const STORAGE_DRIVER = process.env.STORAGE_DRIVER?.trim().toLowerCase() ?? "local";
const PUBLIC_DIR = path.join(process.cwd(), "public");
const LOCAL_STORAGE_ROOT = path.join(
  PUBLIC_DIR,
  process.env.STORAGE_LOCAL_DIR?.trim() || path.join("uploads", "products"),
);

function normalizePublicPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getExtension(fileName: string | undefined, contentType: string | null | undefined) {
  const pathExtension = path.extname(fileName || "").toLowerCase();

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

  if (contentType?.includes("svg")) {
    return ".svg";
  }

  return ".bin";
}

async function ensureLocalRoot() {
  await mkdir(LOCAL_STORAGE_ROOT, { recursive: true });
}

function resolveManagedLocalPath(assetPath: string) {
  const normalized = normalizePublicPath(assetPath);
  const absolute = path.resolve(PUBLIC_DIR, normalized);
  const root = path.resolve(LOCAL_STORAGE_ROOT);

  if (!absolute.startsWith(root)) {
    return null;
  }

  return absolute;
}

/** Vercel Blob public URLs use this host pattern (store id is the first label). */
function isVercelBlobPublicUrl(assetPath: string): boolean {
  try {
    const url = new URL(assetPath);
    if (url.protocol !== "https:") {
      return false;
    }
    return url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

const localStorageDriver: StorageDriver = {
  async upload(input) {
    await ensureLocalRoot();
    const extension = getExtension(input.fileName, input.contentType);
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const relativeFolder = input.folder?.trim().replace(/^\/+|\/+$/g, "") || "";
    const targetDir = relativeFolder ? path.join(LOCAL_STORAGE_ROOT, relativeFolder) : LOCAL_STORAGE_ROOT;
    await mkdir(targetDir, { recursive: true });
    const absolutePath = path.join(targetDir, filename);
    await writeFile(absolutePath, input.buffer);

    const relativeToPublic = path.relative(PUBLIC_DIR, absolutePath);
    const publicPath = `/${normalizePublicPath(relativeToPublic)}`;

    return {
      path: publicPath,
      publicUrl: publicPath,
    };
  },
  async remove(assetPath) {
    const absolutePath = resolveManagedLocalPath(assetPath);

    if (!absolutePath) {
      return;
    }

    try {
      await unlink(absolutePath);
    } catch {
      // Ignore missing files.
    }
  },
  isManagedPath(assetPath): assetPath is string {
    return Boolean(assetPath && resolveManagedLocalPath(assetPath));
  },
};

const vercelBlobStorageDriver: StorageDriver = {
  async upload(input) {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      throw new Error(
        "STORAGE_BLOB_TOKEN_MISSING",
      );
    }

    const extension = getExtension(input.fileName, input.contentType);
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const relativeFolder = input.folder?.trim().replace(/^\/+|\/+$/g, "") || "";
    const pathname = relativeFolder ? `${relativeFolder}/${filename}` : `products/${filename}`;

    const blob = await put(pathname, input.buffer, {
      access: "public",
      token,
      contentType: input.contentType || undefined,
      addRandomSuffix: false,
    });

    return {
      path: blob.url,
      publicUrl: blob.url,
    };
  },
  async remove(assetPath) {
    if (!isVercelBlobPublicUrl(assetPath)) {
      return;
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      return;
    }
    try {
      await del(assetPath, { token });
    } catch {
      // Ignore missing blobs (already removed or token scope).
    }
  },
  isManagedPath(assetPath): assetPath is string {
    return Boolean(assetPath && isVercelBlobPublicUrl(assetPath));
  },
};

let externalFallbackWarningShown = false;
let vercelBlobTokenMissingFallbackWarningShown = false;

function getStorageDriver(): StorageDriver {
  if (STORAGE_DRIVER === "local") {
    return localStorageDriver;
  }

  if (STORAGE_DRIVER === "vercel-blob" || STORAGE_DRIVER === "blob") {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) {
      if (!vercelBlobTokenMissingFallbackWarningShown) {
        vercelBlobTokenMissingFallbackWarningShown = true;
        void logEvent(
          "warn",
          "STORAGE_DRIVER is vercel-blob but BLOB_READ_WRITE_TOKEN is missing; using local filesystem for uploads (set the token in production on Vercel)",
          {},
        );
      }
      return localStorageDriver;
    }
    return vercelBlobStorageDriver;
  }

  if (!externalFallbackWarningShown) {
    externalFallbackWarningShown = true;
    void logEvent(
      "warn",
      "Unknown STORAGE_DRIVER; falling back to local storage (ephemeral on Vercel serverless)",
      {
        requestedDriver: STORAGE_DRIVER,
      },
    );
  }

  return localStorageDriver;
}

export async function uploadFileToStorage(input: StorageUploadInput) {
  return getStorageDriver().upload(input);
}

/**
 * Deletes a stored asset. Accepts either a Vercel Blob HTTPS URL or a local `/uploads/...` path
 * under the configured product folder, regardless of current `STORAGE_DRIVER`, so admin can remove
 * legacy paths after switching drivers.
 */
export async function removeFileFromStorage(assetPath: string | null | undefined) {
  if (!assetPath) {
    return;
  }

  if (isVercelBlobPublicUrl(assetPath)) {
    await vercelBlobStorageDriver.remove(assetPath);
    return;
  }

  if (localStorageDriver.isManagedPath(assetPath)) {
    await localStorageDriver.remove(assetPath);
  }
}

export function isManagedStoragePath(assetPath: string | null | undefined): assetPath is string {
  if (!assetPath) {
    return false;
  }
  if (isVercelBlobPublicUrl(assetPath)) {
    return true;
  }
  return localStorageDriver.isManagedPath(assetPath);
}
