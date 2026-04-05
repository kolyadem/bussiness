import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
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
  kind: "local";
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

const localStorageDriver: StorageDriver = {
  kind: "local",
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

let externalFallbackWarningShown = false;

function getStorageDriver() {
  if (STORAGE_DRIVER === "local") {
    return localStorageDriver;
  }

  if (!externalFallbackWarningShown) {
    externalFallbackWarningShown = true;
    void logEvent(
      "warn",
      "External storage driver requested but not configured; falling back to local storage",
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

export async function removeFileFromStorage(assetPath: string | null | undefined) {
  if (!assetPath) {
    return;
  }

  const driver = getStorageDriver();

  if (!driver.isManagedPath(assetPath)) {
    return;
  }

  await driver.remove(assetPath);
}

export function isManagedStoragePath(assetPath: string | null | undefined) {
  return getStorageDriver().isManagedPath(assetPath);
}
