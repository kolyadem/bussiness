import { db } from "@/lib/db";
import { dispatchImportAlertEvent } from "@/lib/admin/imports/dispatch";

export const IMPORT_ALERT_TYPES = [
  "REPEATED_FAILURE",
  "STALE_SYNC",
  "CRITICAL_SOURCE_ERROR",
  "STUCK_SYNC",
  "PERSISTENT_PARTIAL_SUCCESS",
] as const;

export type ImportAlertType = (typeof IMPORT_ALERT_TYPES)[number];

export const IMPORT_ALERT_SEVERITIES = ["INFO", "WARNING", "ERROR", "CRITICAL"] as const;

export type ImportAlertSeverity = (typeof IMPORT_ALERT_SEVERITIES)[number];

export const IMPORT_ALERT_STATUSES = ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"] as const;

export type ImportAlertStatus = (typeof IMPORT_ALERT_STATUSES)[number];

export type ImportAlertLocale = "uk";

export function isImportAlertType(value: string): value is ImportAlertType {
  return IMPORT_ALERT_TYPES.includes(value as ImportAlertType);
}

export function isImportAlertSeverity(value: string): value is ImportAlertSeverity {
  return IMPORT_ALERT_SEVERITIES.includes(value as ImportAlertSeverity);
}

export function isImportAlertStatus(value: string): value is ImportAlertStatus {
  return IMPORT_ALERT_STATUSES.includes(value as ImportAlertStatus);
}

export function getImportAlertSeverityTone(severity: ImportAlertSeverity) {
  switch (severity) {
    case "INFO":
      return "border border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "WARNING":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "ERROR":
      return "border border-rose-500/20 bg-rose-500/10 text-rose-100";
    case "CRITICAL":
      return "border border-red-500/25 bg-red-500/15 text-red-100";
  }
}

export function getImportAlertStatusTone(status: ImportAlertStatus) {
  switch (status) {
    case "ACTIVE":
      return "border border-rose-500/20 bg-rose-500/10 text-rose-100";
    case "ACKNOWLEDGED":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "RESOLVED":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }
}

export function getImportAlertSeverityLabel(
  severity: ImportAlertSeverity,
  _locale: ImportAlertLocale,
) {
  switch (severity) {
    case "INFO":
      return "Інфо";
    case "WARNING":
      return "Попередження";
    case "ERROR":
      return "Помилка";
    case "CRITICAL":
      return "Критично";
  }
}

export function getImportAlertStatusLabel(
  status: ImportAlertStatus,
  _locale: ImportAlertLocale,
) {
  switch (status) {
    case "ACTIVE":
      return "Активний";
    case "ACKNOWLEDGED":
      return "Підтверджено";
    case "RESOLVED":
      return "Вирішено";
  }
}

type RaiseImportAlertInput = {
  sourceConfigId: string;
  jobId?: string | null;
  type: ImportAlertType;
  severity: ImportAlertSeverity;
  title: string;
  message: string;
  details?: string;
  skipExistingUpdate?: boolean;
  now?: Date;
};

export async function raiseImportAlert(input: RaiseImportAlertInput) {
  const now = input.now ?? new Date();
  const existing = await db.importAlert.findFirst({
    where: {
      sourceConfigId: input.sourceConfigId,
      type: input.type,
      status: {
        in: ["ACTIVE", "ACKNOWLEDGED"],
      },
    },
    orderBy: {
      lastDetectedAt: "desc",
    },
  });

  let alert;
  let eventType: "created" | "updated";

  if (existing) {
    if (input.skipExistingUpdate) {
      return existing;
    }

    alert = await db.importAlert.update({
      where: {
        id: existing.id,
      },
      data: {
        jobId: input.jobId ?? existing.jobId,
        severity: input.severity,
        title: input.title,
        message: input.message,
        details: input.details ?? existing.details,
        lastDetectedAt: now,
        occurrenceCount: existing.occurrenceCount + 1,
        status: existing.status === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : "ACTIVE",
        resolvedAt: null,
      },
      include: {
        sourceConfig: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        job: {
          select: {
            id: true,
            status: true,
            triggerType: true,
          },
        },
      },
    });
    eventType = "updated";
  } else {
    alert = await db.importAlert.create({
      data: {
        sourceConfigId: input.sourceConfigId,
        jobId: input.jobId ?? null,
        type: input.type,
        severity: input.severity,
        title: input.title,
        message: input.message,
        details: input.details ?? "{}",
        firstDetectedAt: now,
        lastDetectedAt: now,
      },
      include: {
        sourceConfig: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
        job: {
          select: {
            id: true,
            status: true,
            triggerType: true,
          },
        },
      },
    });
    eventType = "created";
  }

  await dispatchImportAlertEvent({
    type: eventType,
    alert,
  });

  return alert;
}

export async function resolveImportAlerts(input: {
  sourceConfigId: string;
  types?: ImportAlertType[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const activeAlerts = await db.importAlert.findMany({
    where: {
      sourceConfigId: input.sourceConfigId,
      status: {
        in: ["ACTIVE", "ACKNOWLEDGED"],
      },
      ...(input.types?.length
        ? {
            type: {
              in: input.types,
            },
          }
        : {}),
    },
    include: {
      sourceConfig: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
      job: {
        select: {
          id: true,
          status: true,
          triggerType: true,
        },
      },
    },
  });

  if (activeAlerts.length === 0) {
    return { count: 0 };
  }

  await db.importAlert.updateMany({
    where: {
      id: {
        in: activeAlerts.map((alert) => alert.id),
      },
    },
    data: {
      status: "RESOLVED",
      resolvedAt: now,
    },
  });

  await Promise.all(
    activeAlerts.map((alert) =>
      dispatchImportAlertEvent({
        type: "resolved",
        alert: {
          ...alert,
          status: "RESOLVED",
          resolvedAt: now,
        },
      }),
    ),
  );

  return { count: activeAlerts.length };
}

export async function acknowledgeImportAlert(input: {
  id: string;
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const alert = await db.importAlert.update({
    where: {
      id: input.id,
    },
    data: {
      status: "ACKNOWLEDGED",
      acknowledgedAt: now,
      acknowledgedByUserId: input.userId,
    },
    include: {
      sourceConfig: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
      job: {
        select: {
          id: true,
          status: true,
          triggerType: true,
        },
      },
      acknowledgedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          login: true,
        },
      },
    },
  });

  await dispatchImportAlertEvent({
    type: "acknowledged",
    alert,
  });

  return alert;
}

export async function getImportAlerts(input?: {
  status?: ImportAlertStatus | "ALL";
  limit?: number;
}) {
  return db.importAlert.findMany({
    where:
      input?.status && input.status !== "ALL"
        ? {
            status: input.status,
          }
        : undefined,
    include: {
      sourceConfig: {
        select: {
          id: true,
          key: true,
          name: true,
        },
      },
      job: {
        select: {
          id: true,
          status: true,
          triggerType: true,
        },
      },
      acknowledgedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          login: true,
        },
      },
    },
    orderBy: [
      {
        status: "asc",
      },
      {
        lastDetectedAt: "desc",
      },
    ],
    take: input?.limit ?? 50,
  });
}

export async function scanImportHealthAlerts(input?: {
  now?: Date;
  staleHours?: number;
  pausedDays?: number;
  stuckMinutes?: number;
}) {
  const now = input?.now ?? new Date();
  const staleThreshold = new Date(now.getTime() - (input?.staleHours ?? 36) * 60 * 60 * 1000);
  const stuckThreshold = new Date(now.getTime() - (input?.stuckMinutes ?? 30) * 60 * 1000);
  const pausedThreshold = new Date(now.getTime() - (input?.pausedDays ?? 14) * 24 * 60 * 60 * 1000);
  const sources = await db.importSourceConfig.findMany({
    where: {
      OR: [
        {
          isActive: true,
        },
        {
          isActive: false,
          updatedAt: {
            lte: pausedThreshold,
          },
        },
      ],
    },
  });

  for (const source of sources) {
    if (source.isSyncing && source.syncLockedAt && source.syncLockedAt <= stuckThreshold) {
      await raiseImportAlert({
        sourceConfigId: source.id,
        jobId: source.lastJobId ?? null,
        type: "STUCK_SYNC",
        severity: "CRITICAL",
        title: "Import source appears stuck",
        message: `${source.name} has been syncing longer than expected.`,
        details: JSON.stringify({
          syncLockedAt: source.syncLockedAt.toISOString(),
        }),
        skipExistingUpdate: true,
        now,
      });
    } else {
      await resolveImportAlerts({
        sourceConfigId: source.id,
        types: ["STUCK_SYNC"],
        now,
      });
    }

    if (source.isActive && source.nextSyncAt && source.nextSyncAt <= staleThreshold) {
      await raiseImportAlert({
        sourceConfigId: source.id,
        jobId: source.lastJobId ?? null,
        type: "STALE_SYNC",
        severity: "WARNING",
        title: "Import source missed expected sync",
        message: `${source.name} has not synced for longer than expected.`,
        details: JSON.stringify({
          lastSyncAt: source.lastSyncAt?.toISOString() ?? null,
          nextSyncAt: source.nextSyncAt.toISOString(),
        }),
        skipExistingUpdate: true,
        now,
      });
    } else {
      await resolveImportAlerts({
        sourceConfigId: source.id,
        types: ["STALE_SYNC"],
        now,
      });
    }
  }
}
