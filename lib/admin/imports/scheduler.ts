import { db } from "@/lib/db";
import {
  claimImportSourceConfig,
  getDueImportSourceConfigs,
  releaseImportSourceConfig,
} from "@/lib/admin/imports/persistence";
import { runProductImport } from "@/lib/admin/imports/pipeline";
import { raiseImportAlert, resolveImportAlerts } from "@/lib/admin/imports/alerts";
import { resolveFailedImportRetryAt, resolveNextImportSyncAt } from "@/lib/admin/imports/schedule";
import {
  isImportJobStatus,
  isImportMode,
  isImportSourceType,
  type ImportJobStatus,
  type ImportJobTrigger,
  type ImportMode,
  type ImportSourceType,
} from "@/lib/admin/imports/types";

const DEFAULT_LOCK_TTL_MS = 15 * 60 * 1000;

function parseAuthHeaders(input: string | null) {
  if (!input) {
    return {};
  }

  try {
    const parsed = JSON.parse(input) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
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
    return {};
  }
}

function buildRuntimeHeaders(input: {
  authType: string;
  authToken?: string | null;
  authHeaders: Record<string, string>;
}) {
  const headers = {
    ...input.authHeaders,
  };

  if (input.authType === "BEARER" && input.authToken) {
    headers.Authorization = `Bearer ${input.authToken}`;
  }

  return headers;
}

function resolveReleaseState(input: {
  now: Date;
  frequency?: string | null;
  previousFailures: number;
  resultOk: boolean;
  resultStatus?: string | null;
  error?: string | null;
}) {
  const status = isImportJobStatus(String(input.resultStatus ?? ""))
    ? (input.resultStatus as ImportJobStatus)
    : (input.resultOk ? "SUCCESS" : "FAILED");
  const successLike = status === "SUCCESS" || status === "PARTIAL_SUCCESS";
  const nextFailures = successLike ? 0 : input.previousFailures + 1;

  return {
    lastSyncStatus: status,
    lastSyncError: successLike ? null : input.error ?? "See import job details",
    nextSyncAt: successLike
      ? resolveNextImportSyncAt({
          frequency: input.frequency,
          from: input.now,
        })
      : resolveFailedImportRetryAt({
          now: input.now,
          consecutiveFailures: nextFailures,
        }),
    consecutiveFailures: nextFailures,
    touchLastSyncAt: successLike,
  };
}

async function syncExecutionAlerts(input: {
  sourceConfig: Awaited<ReturnType<typeof db.importSourceConfig.findUnique>>;
  now: Date;
  jobId?: string | null;
  jobStatus: ImportJobStatus;
  errorCount?: number;
  warningCount?: number;
  fatalError?: string | null;
  consecutiveFailures: number;
}) {
  if (!input.sourceConfig) {
    return;
  }

  const jobStatus = String(input.jobStatus);

  if (jobStatus === "SUCCESS") {
    await resolveImportAlerts({
      sourceConfigId: input.sourceConfig.id,
      types: ["REPEATED_FAILURE", "CRITICAL_SOURCE_ERROR", "PERSISTENT_PARTIAL_SUCCESS"],
      now: input.now,
    });
    return;
  }

  if (jobStatus === "PARTIAL_SUCCESS" && (input.errorCount ?? 0) > 0) {
    await raiseImportAlert({
      sourceConfigId: input.sourceConfig.id,
      jobId: input.jobId ?? null,
      type: "PERSISTENT_PARTIAL_SUCCESS",
      severity: (input.errorCount ?? 0) >= 3 ? "ERROR" : "WARNING",
      title: "Import finished with product-level errors",
      message: `${input.sourceConfig.name} completed with ${(input.errorCount ?? 0)} errors and ${(input.warningCount ?? 0)} warnings.`,
      details: JSON.stringify({
        errorCount: input.errorCount ?? 0,
        warningCount: input.warningCount ?? 0,
      }),
      now: input.now,
    });
  } else {
    await resolveImportAlerts({
      sourceConfigId: input.sourceConfig.id,
      types: ["PERSISTENT_PARTIAL_SUCCESS"],
      now: input.now,
    });
  }

  if (jobStatus === "FAILED" && input.consecutiveFailures >= 2) {
    await raiseImportAlert({
      sourceConfigId: input.sourceConfig.id,
      jobId: input.jobId ?? null,
      type: "REPEATED_FAILURE",
      severity: input.consecutiveFailures >= 4 ? "CRITICAL" : "ERROR",
      title: "Import source keeps failing",
      message: `${input.sourceConfig.name} has failed ${input.consecutiveFailures} times in a row.`,
      details: JSON.stringify({
        consecutiveFailures: input.consecutiveFailures,
      }),
      now: input.now,
    });
  } else if (jobStatus !== "FAILED") {
    await resolveImportAlerts({
      sourceConfigId: input.sourceConfig.id,
      types: ["REPEATED_FAILURE"],
      now: input.now,
    });
  }

  const criticalMessage = input.fatalError?.toLowerCase() ?? "";
  const successLike = jobStatus === "SUCCESS" || jobStatus === "PARTIAL_SUCCESS";
  const shouldRaiseCritical =
    jobStatus === "FAILED" &&
    (criticalMessage.includes("401") ||
      criticalMessage.includes("403") ||
      criticalMessage.includes("auth") ||
      criticalMessage.includes("payload") ||
      criticalMessage.includes("parse") ||
      criticalMessage.includes("malformed"));

  if (shouldRaiseCritical) {
    await raiseImportAlert({
      sourceConfigId: input.sourceConfig.id,
      jobId: input.jobId ?? null,
      type: "CRITICAL_SOURCE_ERROR",
      severity: "CRITICAL",
      title: "Critical import source error",
      message: input.fatalError ?? `${input.sourceConfig.name} failed critically.`,
      details: JSON.stringify({
        sourceKey: input.sourceConfig.key,
      }),
      now: input.now,
    });
  } else if (successLike) {
    await resolveImportAlerts({
      sourceConfigId: input.sourceConfig.id,
      types: ["CRITICAL_SOURCE_ERROR"],
      now: input.now,
    });
  }
}

export async function executeImportSourceConfig(input: {
  sourceConfigId: string;
  triggerType: ImportJobTrigger;
  startedByUserId?: string | null;
  dryRun?: boolean;
  importModeOverride?: string | null;
  requireDue?: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const sourceConfig = await db.importSourceConfig.findUnique({
    where: {
      id: input.sourceConfigId,
    },
  });

  if (!sourceConfig) {
    return {
      ok: false as const,
      reason: "missing_source",
      error: "Import source config not found",
    };
  }

  if (!sourceConfig.isActive && input.triggerType === "SCHEDULED") {
    return {
      ok: false as const,
      reason: "inactive",
      error: "Import source is inactive",
    };
  }

  if (!isImportSourceType(sourceConfig.sourceType)) {
    return {
      ok: false as const,
      reason: "invalid_source_type",
      error: "Stored source type is invalid",
    };
  }

  if (sourceConfig.sourceType.startsWith("UPLOAD_")) {
    return {
      ok: false as const,
      reason: "upload_source_unsupported",
      error: "Uploaded file sources cannot be scheduled automatically",
    };
  }

  if (!sourceConfig.endpointUrl) {
    return {
      ok: false as const,
      reason: "missing_endpoint",
      error: "Import source URL is missing",
    };
  }

  const claimed = await claimImportSourceConfig({
    sourceId: sourceConfig.id,
    now,
    staleBefore: new Date(now.getTime() - DEFAULT_LOCK_TTL_MS),
    requireDue: input.requireDue,
    requireActive: input.triggerType === "SCHEDULED",
  });

  if (!claimed) {
    return {
      ok: false as const,
      reason: "already_running",
      error: "Import source is already running",
    };
  }

  try {
    const importMode = isImportMode(String(input.importModeOverride ?? ""))
      ? (input.importModeOverride as ImportMode)
      : isImportMode(sourceConfig.defaultImportMode)
        ? (sourceConfig.defaultImportMode as ImportMode)
        : ("UPSERT" as ImportMode);
    const runtimeHeaders = buildRuntimeHeaders({
      authType: sourceConfig.authType,
      authToken: sourceConfig.authToken ?? null,
      authHeaders: parseAuthHeaders(sourceConfig.authHeaders),
    });
    const result = await runProductImport({
      startedByUserId: input.startedByUserId ?? null,
      sourceConfigId: sourceConfig.id,
      sourceKey: sourceConfig.key,
      sourceType: sourceConfig.sourceType as ImportSourceType,
      sourceUrl: sourceConfig.endpointUrl,
      importMode,
      triggerType: input.triggerType,
      dryRun: input.dryRun ?? false,
      timeoutMs: sourceConfig.timeoutMs,
      retryCount: sourceConfig.retryCount,
      maxRows: sourceConfig.maxRows,
      maxPayloadBytes: sourceConfig.maxPayloadBytes,
      authHeaders: runtimeHeaders,
      skuFallbackEnabled: sourceConfig.skuFallbackEnabled,
      slugFallbackEnabled: sourceConfig.slugFallbackEnabled,
    });
    const job = await db.importJob.findUnique({
      where: {
        id: result.jobId,
      },
      select: {
        id: true,
        status: true,
        errorCount: true,
        warningCount: true,
        report: true,
      },
    });
    const releaseState = resolveReleaseState({
      now,
      frequency: sourceConfig.frequency,
      previousFailures: sourceConfig.consecutiveFailures,
      resultOk: result.ok,
      resultStatus: job?.status ?? null,
      error: "error" in result ? result.error ?? null : null,
    });

    await releaseImportSourceConfig({
      sourceId: sourceConfig.id,
      now,
      nextSyncAt: releaseState.nextSyncAt,
      lastSyncStatus: releaseState.lastSyncStatus,
      lastSyncError: releaseState.lastSyncError,
      lastJobId: job?.id ?? result.jobId ?? null,
      consecutiveFailures: releaseState.consecutiveFailures,
      touchLastSyncAt: releaseState.touchLastSyncAt,
    });
    const fatalError =
      typeof ("error" in result ? result.error : undefined) === "string"
        ? ("error" in result ? result.error : undefined)
        : null;
    await syncExecutionAlerts({
      sourceConfig,
      now,
      jobId: job?.id ?? result.jobId ?? null,
      jobStatus: releaseState.lastSyncStatus,
      errorCount: job?.errorCount ?? 0,
      warningCount: job?.warningCount ?? 0,
      fatalError,
      consecutiveFailures: releaseState.consecutiveFailures,
    });

    return {
      ok: result.ok,
      sourceId: sourceConfig.id,
      sourceKey: sourceConfig.key,
      jobId: result.jobId,
      status: releaseState.lastSyncStatus,
      nextSyncAt: releaseState.nextSyncAt,
      error: "error" in result ? result.error : undefined,
    };
  } catch (error) {
    const failureCount = sourceConfig.consecutiveFailures + 1;
    await releaseImportSourceConfig({
      sourceId: sourceConfig.id,
      now,
      nextSyncAt: resolveFailedImportRetryAt({
        now,
        consecutiveFailures: failureCount,
      }),
      lastSyncStatus: "FAILED",
      lastSyncError: error instanceof Error ? error.message : "Scheduled import failed",
      lastJobId: null,
      consecutiveFailures: failureCount,
      touchLastSyncAt: false,
    });
    await syncExecutionAlerts({
      sourceConfig,
      now,
      jobId: null,
      jobStatus: "FAILED",
      fatalError: error instanceof Error ? error.message : "Scheduled import failed",
      consecutiveFailures: failureCount,
    });

    return {
      ok: false as const,
      sourceId: sourceConfig.id,
      sourceKey: sourceConfig.key,
      reason: "execution_failed",
      error: error instanceof Error ? error.message : "Scheduled import failed",
    };
  }
}

export async function runScheduledImportSources(input?: {
  now?: Date;
  limit?: number;
}) {
  const now = input?.now ?? new Date();
  const sources = await getDueImportSourceConfigs({
    now,
    limit: input?.limit ?? 10,
  });
  const results = [];

  for (const source of sources) {
    const result = await executeImportSourceConfig({
      sourceConfigId: source.id,
      triggerType: "SCHEDULED",
      requireDue: true,
      now,
    });

    results.push(result);
  }

  return {
    ok: true as const,
    checkedAt: now.toISOString(),
    totalDue: sources.length,
    startedCount: results.filter((result) => result.ok).length,
    skippedCount: results.filter((result) => !result.ok && result.reason === "already_running").length,
    failedCount: results.filter((result) => !result.ok && result.reason !== "already_running").length,
    results,
  };
}
