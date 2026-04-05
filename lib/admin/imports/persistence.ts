import { db } from "@/lib/db";
import type {
  ImportIssueSeverity,
  ImportJobStatus,
  ImportJobTrigger,
  ImportMode,
  ImportSourceType,
} from "@/lib/admin/imports/types";

export async function createImportJob(input: {
  sourceConfigId?: string | null;
  startedByUserId?: string | null;
  sourceKey?: string | null;
  sourceType: ImportSourceType;
  sourceUrl?: string | null;
  sourceFileName?: string | null;
  importMode: ImportMode;
  triggerType?: ImportJobTrigger;
  dryRun: boolean;
  payloadSizeBytes?: number | null;
  sourceMeta?: string;
  report?: string;
}) {
  return db.importJob.create({
    data: {
      sourceConfigId: input.sourceConfigId ?? null,
      startedByUserId: input.startedByUserId ?? null,
      sourceKey: input.sourceKey ?? null,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl ?? null,
      sourceFileName: input.sourceFileName ?? null,
      importMode: input.importMode,
      triggerType: input.triggerType ?? "MANUAL",
      status: "QUEUED",
      dryRun: input.dryRun,
      payloadSizeBytes: input.payloadSizeBytes ?? null,
      sourceMeta: input.sourceMeta ?? "{}",
      report: input.report ?? "{}",
    },
  });
}

export async function markImportJobRunning(jobId: string) {
  return db.importJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function finalizeImportJob(input: {
  jobId: string;
  status: ImportJobStatus;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  warningCount: number;
  errorCount: number;
  report?: string;
}) {
  return db.importJob.update({
    where: { id: input.jobId },
    data: {
      status: input.status,
      totalRows: input.totalRows,
      createdCount: input.createdCount,
      updatedCount: input.updatedCount,
      skippedCount: input.skippedCount,
      failedCount: input.failedCount,
      warningCount: input.warningCount,
      errorCount: input.errorCount,
      report: input.report ?? "{}",
      completedAt: new Date(),
    },
  });
}

export async function failImportJob(jobId: string, message: string) {
  return db.importJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      report: JSON.stringify({ fatalError: message }),
    },
  });
}

export async function createImportJobIssues(
  jobId: string,
  issues: Array<{
    rowIndex?: number | null;
    severity: ImportIssueSeverity;
    code: string;
    message: string;
    rawIdentifier?: string | null;
    details?: string;
  }>,
) {
  if (issues.length === 0) {
    return;
  }

  await db.importJobIssue.createMany({
    data: issues.map((issue) => ({
      jobId,
      rowIndex: issue.rowIndex ?? null,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      rawIdentifier: issue.rawIdentifier ?? null,
      details: issue.details ?? "{}",
    })),
  });
}

export async function upsertImportSourceConfig(input: {
  key: string;
  name: string;
  sourceType: string;
  endpointUrl?: string | null;
  authType?: string;
  authToken?: string | null;
  authHeaders?: string;
  timeoutMs?: number;
  retryCount?: number;
  maxRows?: number;
  maxPayloadBytes?: number;
  defaultImportMode?: string;
  skuFallbackEnabled?: boolean;
  slugFallbackEnabled?: boolean;
  isActive?: boolean;
  frequency?: string | null;
  nextSyncAt?: Date | null;
  lastSyncAt?: Date | null;
  createdByUserId?: string | null;
  updatedByUserId?: string | null;
}) {
  return db.importSourceConfig.upsert({
    where: {
      key: input.key,
    },
    update: {
      name: input.name,
      sourceType: input.sourceType,
      endpointUrl: input.endpointUrl ?? null,
      authType: input.authType ?? "NONE",
      authToken: input.authToken ?? null,
      authHeaders: input.authHeaders ?? "{}",
      timeoutMs: input.timeoutMs ?? 15000,
      retryCount: input.retryCount ?? 1,
      maxRows: input.maxRows ?? 500,
      maxPayloadBytes: input.maxPayloadBytes ?? 5_242_880,
      defaultImportMode: input.defaultImportMode ?? "UPSERT",
      skuFallbackEnabled: input.skuFallbackEnabled ?? true,
      slugFallbackEnabled: input.slugFallbackEnabled ?? false,
      isActive: input.isActive ?? true,
      frequency: input.frequency ?? null,
      nextSyncAt: input.nextSyncAt ?? null,
      lastSyncAt: input.lastSyncAt ?? null,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    create: {
      key: input.key,
      name: input.name,
      sourceType: input.sourceType,
      endpointUrl: input.endpointUrl ?? null,
      authType: input.authType ?? "NONE",
      authToken: input.authToken ?? null,
      authHeaders: input.authHeaders ?? "{}",
      timeoutMs: input.timeoutMs ?? 15000,
      retryCount: input.retryCount ?? 1,
      maxRows: input.maxRows ?? 500,
      maxPayloadBytes: input.maxPayloadBytes ?? 5_242_880,
      defaultImportMode: input.defaultImportMode ?? "UPSERT",
      skuFallbackEnabled: input.skuFallbackEnabled ?? true,
      slugFallbackEnabled: input.slugFallbackEnabled ?? false,
      isActive: input.isActive ?? true,
      frequency: input.frequency ?? null,
      nextSyncAt: input.nextSyncAt ?? null,
      lastSyncAt: input.lastSyncAt ?? null,
      createdByUserId: input.createdByUserId ?? null,
      updatedByUserId: input.updatedByUserId ?? null,
    },
  });
}

export async function getImportSourceConfigs() {
  return db.importSourceConfig.findMany({
    select: {
      id: true,
      key: true,
      name: true,
      sourceType: true,
      endpointUrl: true,
      timeoutMs: true,
      retryCount: true,
      maxRows: true,
      maxPayloadBytes: true,
      defaultImportMode: true,
      skuFallbackEnabled: true,
      slugFallbackEnabled: true,
      isActive: true,
      isSyncing: true,
      syncLockedAt: true,
      frequency: true,
      nextSyncAt: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      lastSyncError: true,
      lastJobId: true,
      consecutiveFailures: true,
      updatedAt: true,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getImportSourceConfigById(id: string) {
  return db.importSourceConfig.findUnique({
    where: {
      id,
    },
  });
}

export async function getDueImportSourceConfigs(input: {
  now: Date;
  limit?: number;
}) {
  return db.importSourceConfig.findMany({
    where: {
      isActive: true,
      nextSyncAt: {
        lte: input.now,
      },
    },
    orderBy: [
      {
        nextSyncAt: "asc",
      },
      {
        updatedAt: "asc",
      },
    ],
    take: input.limit ?? 10,
  });
}

export async function claimImportSourceConfig(input: {
  sourceId: string;
  now: Date;
  staleBefore: Date;
  requireDue?: boolean;
  requireActive?: boolean;
}) {
  const result = await db.importSourceConfig.updateMany({
    where: {
      id: input.sourceId,
      ...(input.requireActive === false ? {} : { isActive: true }),
      ...(input.requireDue === false
        ? {}
        : {
            nextSyncAt: {
              lte: input.now,
            },
          }),
      OR: [
        {
          isSyncing: false,
        },
        {
          isSyncing: true,
          syncLockedAt: {
            lt: input.staleBefore,
          },
        },
      ],
    },
    data: {
      isSyncing: true,
      syncLockedAt: input.now,
    },
  });

  return result.count === 1;
}

export async function releaseImportSourceConfig(input: {
  sourceId: string;
  now: Date;
  nextSyncAt: Date | null;
  lastSyncStatus: string;
  lastSyncError?: string | null;
  lastJobId?: string | null;
  consecutiveFailures: number;
  touchLastSyncAt?: boolean;
}) {
  return db.importSourceConfig.update({
    where: {
      id: input.sourceId,
    },
    data: {
      isSyncing: false,
      syncLockedAt: null,
      nextSyncAt: input.nextSyncAt,
      lastSyncAt: input.touchLastSyncAt ? input.now : undefined,
      lastSyncStatus: input.lastSyncStatus,
      lastSyncError: input.lastSyncError ?? null,
      lastJobId: input.lastJobId ?? null,
      consecutiveFailures: input.consecutiveFailures,
    },
  });
}

export async function getImportJobHistory(limit = 20) {
  return db.importJob.findMany({
    include: {
      issues: {
        orderBy: [
          {
            rowIndex: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
        take: 8,
      },
      sourceConfig: {
        select: {
          id: true,
          key: true,
          name: true,
          endpointUrl: true,
          nextSyncAt: true,
          lastSyncAt: true,
          isActive: true,
          isSyncing: true,
          syncLockedAt: true,
          lastSyncStatus: true,
          lastSyncError: true,
          lastJobId: true,
          consecutiveFailures: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

export async function getImportJobById(id: string) {
  return db.importJob.findUnique({
    where: {
      id,
    },
    include: {
      issues: {
        orderBy: [
          {
            severity: "desc",
          },
          {
            rowIndex: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      },
      sourceConfig: {
        select: {
          id: true,
          key: true,
          name: true,
          sourceType: true,
          endpointUrl: true,
          timeoutMs: true,
          retryCount: true,
          maxRows: true,
          maxPayloadBytes: true,
          defaultImportMode: true,
          skuFallbackEnabled: true,
          slugFallbackEnabled: true,
          isActive: true,
          isSyncing: true,
          syncLockedAt: true,
          frequency: true,
          nextSyncAt: true,
          lastSyncAt: true,
          lastSyncStatus: true,
          lastSyncError: true,
          lastJobId: true,
          consecutiveFailures: true,
          updatedAt: true,
        },
      },
    },
  });
}
