import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { runProductImport } from "@/lib/admin/imports/pipeline";
import { executeImportSourceConfig } from "@/lib/admin/imports/scheduler";
import {
  isImportMode,
  isImportSourceType,
  type ImportAuthType,
  type ImportSourceType,
} from "@/lib/admin/imports/types";
import { upsertImportSourceConfig } from "@/lib/admin/imports/persistence";

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

function normalizeText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeBoolean(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "yes";
}

function normalizeInteger(value: FormDataEntryValue | null, fallback: number) {
  const normalized = Number(String(value ?? "").trim());
  return Number.isFinite(normalized) && normalized > 0 ? Math.trunc(normalized) : fallback;
}

function parseAuthHeaders(input: string | null) {
  if (!input) {
    return {};
  }

  try {
    const parsed = JSON.parse(input) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        const normalizedKey = String(key ?? "").trim();
        const normalizedValue = String(value ?? "").trim();

        if (!normalizedKey || !normalizedValue) {
          return [];
        }

        return [[normalizedKey, normalizedValue] as const];
      }),
    );
  } catch {
    return null;
  }
}

function buildRuntimeHeaders(input: {
  authType: ImportAuthType;
  authToken?: string | null;
  authHeaders?: Record<string, string>;
}) {
  const headers = {
    ...(input.authHeaders ?? {}),
  };

  if (input.authType === "BEARER" && input.authToken) {
    headers.Authorization = `Bearer ${input.authToken}`;
  }

  return headers;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Некоректні дані форми" }, { status: 400 });
  }

  const sourceConfigId = normalizeText(formData.get("sourceConfigId"));
  const sourceKeyInput = normalizeText(formData.get("sourceKey"));
  const sourceName = normalizeText(formData.get("sourceName"));
  const sourceTypeValue = String(formData.get("sourceType") ?? "").trim().toUpperCase();
  const sourceUrlInput = normalizeText(formData.get("sourceUrl"));
  const sourceFile = formData.get("sourceFile");
  const importModeValue = String(formData.get("importMode") ?? "").trim().toUpperCase();
  const dryRun = normalizeBoolean(formData.get("dryRun"));
  const saveSourceConfig = normalizeBoolean(formData.get("saveSourceConfig"));
  const authType = (String(formData.get("authType") ?? "NONE").trim().toUpperCase() || "NONE") as ImportAuthType;
  const authToken = normalizeText(formData.get("authToken"));
  const authHeadersRaw = normalizeText(formData.get("authHeaders"));
  const timeoutMs = normalizeInteger(formData.get("timeoutMs"), 15000);
  const retryCount = normalizeInteger(formData.get("retryCount"), 1);
  const maxRows = normalizeInteger(formData.get("maxRows"), 500);
  const maxPayloadBytes = normalizeInteger(formData.get("maxPayloadBytes"), 5_242_880);
  const skuFallbackEnabled = normalizeBoolean(formData.get("skuFallbackEnabled"));
  const slugFallbackEnabled = normalizeBoolean(formData.get("slugFallbackEnabled"));
  const frequency = normalizeText(formData.get("frequency"));
  const nextSyncAtValue = normalizeText(formData.get("nextSyncAt"));

  if (!isImportSourceType(sourceTypeValue)) {
    return NextResponse.json({ error: "Непідтримуваний тип джерела" }, { status: 400 });
  }

  if (!isImportMode(importModeValue)) {
    return NextResponse.json({ error: "Непідтримуваний режим імпорту" }, { status: 400 });
  }

  const rawHeaders = parseAuthHeaders(authHeadersRaw);

  if (rawHeaders === null) {
    return NextResponse.json(
      {
        error: "Поле заголовків авторизації має бути коректним JSON-об'єктом",
      },
      { status: 400 },
    );
  }

  const sourceConfig = sourceConfigId
    ? await db.importSourceConfig.findUnique({
        where: {
          id: sourceConfigId,
        },
      })
    : null;

  if (sourceConfigId && !sourceConfig) {
    return NextResponse.json({ error: "Конфігурацію джерела імпорту не знайдено" }, { status: 404 });
  }

  const sourceType = sourceConfig ? (sourceConfig.sourceType as ImportSourceType) : sourceTypeValue;
  const sourceUrl = sourceUrlInput ?? sourceConfig?.endpointUrl ?? null;
  const sourceKey = sourceKeyInput ?? sourceConfig?.key ?? null;
  const authHeaders = rawHeaders ?? parseAuthHeaders(sourceConfig?.authHeaders ?? "{}") ?? {};
  const runtimeAuthType = sourceConfig ? (sourceConfig.authType as ImportAuthType) : authType;
  const runtimeAuthToken = authToken ?? sourceConfig?.authToken ?? null;
  const runtimeHeaders = buildRuntimeHeaders({
    authType: runtimeAuthType,
    authToken: runtimeAuthToken,
    authHeaders,
  });
  const runtimeTimeoutMs = sourceConfig?.timeoutMs ?? timeoutMs;
  const runtimeRetryCount = sourceConfig?.retryCount ?? retryCount;
  const runtimeMaxRows = sourceConfig?.maxRows ?? maxRows;
  const runtimeMaxPayloadBytes = sourceConfig?.maxPayloadBytes ?? maxPayloadBytes;
  const runtimeMode = importModeValue;
  const runtimeSkuFallbackEnabled = sourceConfig?.skuFallbackEnabled ?? skuFallbackEnabled;
  const runtimeSlugFallbackEnabled = sourceConfig?.slugFallbackEnabled ?? slugFallbackEnabled;

  let rawContent: string | null = null;
  let sourceFileName: string | null = null;

  if (sourceType.startsWith("UPLOAD_")) {
    if (!(sourceFile instanceof File) || sourceFile.size <= 0) {
      return NextResponse.json({ error: "Потрібен файл джерела" }, { status: 400 });
    }

    rawContent = await sourceFile.text();
    sourceFileName = sourceFile.name || null;
  } else if (!sourceUrl) {
    return NextResponse.json({ error: "Потрібен URL джерела" }, { status: 400 });
  }

  let savedSourceConfigId = sourceConfig?.id ?? null;

  if (saveSourceConfig) {
    if (!sourceKey || !sourceName) {
      return NextResponse.json(
        {
          error: "Для збереження шаблону потрібні ключ і назва джерела",
        },
        { status: 400 },
      );
    }

    const nextSyncAt = nextSyncAtValue ? new Date(nextSyncAtValue) : null;
    const savedConfig = await upsertImportSourceConfig({
      key: sourceKey,
      name: sourceName,
      sourceType,
      endpointUrl: sourceUrl,
      authType: runtimeAuthType,
      authToken: runtimeAuthToken,
      authHeaders: JSON.stringify(authHeaders),
      timeoutMs: runtimeTimeoutMs,
      retryCount: runtimeRetryCount,
      maxRows: runtimeMaxRows,
      maxPayloadBytes: runtimeMaxPayloadBytes,
      defaultImportMode: runtimeMode,
      skuFallbackEnabled: runtimeSkuFallbackEnabled,
      slugFallbackEnabled: runtimeSlugFallbackEnabled,
      isActive: true,
      frequency,
      nextSyncAt: nextSyncAt instanceof Date && !Number.isNaN(nextSyncAt.getTime()) ? nextSyncAt : null,
      updatedByUserId: auth.user.id,
      createdByUserId: auth.user.id,
    });

    savedSourceConfigId = savedConfig.id;
  }

  const result =
    savedSourceConfigId && !sourceType.startsWith("UPLOAD_")
      ? await executeImportSourceConfig({
          sourceConfigId: savedSourceConfigId,
          triggerType: "MANUAL",
          startedByUserId: auth.user.id,
          dryRun,
          importModeOverride: runtimeMode,
          requireDue: false,
        })
      : await runProductImport({
          startedByUserId: auth.user.id,
          sourceConfigId: savedSourceConfigId,
          sourceKey,
          sourceType,
          sourceUrl,
          sourceFileName,
          importMode: runtimeMode,
          triggerType: "MANUAL",
          dryRun,
          timeoutMs: runtimeTimeoutMs,
          retryCount: runtimeRetryCount,
          maxRows: runtimeMaxRows,
          maxPayloadBytes: runtimeMaxPayloadBytes,
          authHeaders: runtimeHeaders,
          rawContent,
          skuFallbackEnabled: runtimeSkuFallbackEnabled,
          slugFallbackEnabled: runtimeSlugFallbackEnabled,
        });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
