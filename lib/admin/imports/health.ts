import { db } from "@/lib/db";

const ACTIVE_ALERT_STATUSES = ["ACTIVE", "ACKNOWLEDGED"] as const;
const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type DashboardImportHealthStatus = "healthy" | "attention" | "critical";

export async function getDashboardImportHealth(input?: {
  now?: Date;
  topSourceLimit?: number;
  recentFailedJobsLimit?: number;
}) {
  const now = input?.now ?? new Date();
  const recentFailedSince = new Date(now.getTime() - RECENT_FAILURE_WINDOW_MS);

  const [activeAlerts, syncingSourcesCount, recentFailedJobs, sourcesWithFailedSyncCount] =
    await Promise.all([
      db.importAlert.findMany({
        where: {
          status: {
            in: [...ACTIVE_ALERT_STATUSES],
          },
        },
        include: {
          sourceConfig: {
            select: {
              id: true,
              key: true,
              name: true,
              isSyncing: true,
              lastSyncStatus: true,
              lastSyncAt: true,
              nextSyncAt: true,
              lastSyncError: true,
              consecutiveFailures: true,
            },
          },
        },
        orderBy: [
          {
            severity: "desc",
          },
          {
            lastDetectedAt: "desc",
          },
        ],
      }),
      db.importSourceConfig.count({
        where: {
          isSyncing: true,
        },
      }),
      db.importJob.findMany({
        where: {
          status: "FAILED",
          updatedAt: {
            gte: recentFailedSince,
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: input?.recentFailedJobsLimit ?? 3,
        include: {
          sourceConfig: {
            select: {
              id: true,
              key: true,
              name: true,
            },
          },
        },
      }),
      db.importSourceConfig.count({
        where: {
          lastSyncStatus: "FAILED",
        },
      }),
    ]);

  const criticalAlertsCount = activeAlerts.filter((alert) => alert.severity === "CRITICAL").length;
  const errorAlertsCount = activeAlerts.filter((alert) => alert.severity === "ERROR").length;
  const warningAlertsCount = activeAlerts.filter((alert) => alert.severity === "WARNING").length;
  const staleSourcesCount = new Set(
    activeAlerts.filter((alert) => alert.type === "STALE_SYNC").map((alert) => alert.sourceConfigId),
  ).size;
  const affectedSourcesCount = new Set(activeAlerts.map((alert) => alert.sourceConfigId)).size;

  const sourceMap = new Map<
    string,
    {
      id: string;
      key: string;
      name: string;
      activeAlertsCount: number;
      highestSeverity: "INFO" | "WARNING" | "ERROR" | "CRITICAL";
      alertTypes: string[];
      lastSyncStatus: string | null;
      lastSyncAt: Date | null;
      nextSyncAt: Date | null;
      isSyncing: boolean;
      lastSyncError: string | null;
      consecutiveFailures: number;
      score: number;
    }
  >();

  const severityScore = {
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    CRITICAL: 4,
  } as const;

  for (const alert of activeAlerts) {
    const current = sourceMap.get(alert.sourceConfigId) ?? {
      id: alert.sourceConfig.id,
      key: alert.sourceConfig.key,
      name: alert.sourceConfig.name,
      activeAlertsCount: 0,
      highestSeverity: "INFO" as const,
      alertTypes: [],
      lastSyncStatus: alert.sourceConfig.lastSyncStatus ?? null,
      lastSyncAt: alert.sourceConfig.lastSyncAt ?? null,
      nextSyncAt: alert.sourceConfig.nextSyncAt ?? null,
      isSyncing: alert.sourceConfig.isSyncing,
      lastSyncError: alert.sourceConfig.lastSyncError ?? null,
      consecutiveFailures: alert.sourceConfig.consecutiveFailures,
      score: 0,
    };

    current.activeAlertsCount += 1;
    if (severityScore[alert.severity as keyof typeof severityScore] > severityScore[current.highestSeverity]) {
      current.highestSeverity = alert.severity as keyof typeof severityScore;
    }
    if (!current.alertTypes.includes(alert.type)) {
      current.alertTypes.push(alert.type);
    }

    current.score += severityScore[alert.severity as keyof typeof severityScore] * 10;
    if (alert.type === "STUCK_SYNC") {
      current.score += 30;
    }
    if (alert.type === "REPEATED_FAILURE") {
      current.score += 24;
    }
    if (alert.type === "CRITICAL_SOURCE_ERROR") {
      current.score += 20;
    }
    if (alert.type === "STALE_SYNC") {
      current.score += 12;
    }
    current.score += Math.min(current.consecutiveFailures, 5) * 4;
    if (current.lastSyncStatus === "FAILED") {
      current.score += 8;
    }
    if (current.isSyncing) {
      current.score += 5;
    }

    sourceMap.set(alert.sourceConfigId, current);
  }

  const topSourcesNeedingAttention = Array.from(sourceMap.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.activeAlertsCount - left.activeAlertsCount;
    })
    .slice(0, input?.topSourceLimit ?? 4);

  const status: DashboardImportHealthStatus =
    criticalAlertsCount > 0
      ? "critical"
      : activeAlerts.length > 0 || recentFailedJobs.length > 0 || syncingSourcesCount > 0
        ? "attention"
        : "healthy";

  return {
    status,
    activeAlertsCount: activeAlerts.length,
    criticalAlertsCount,
    errorAlertsCount,
    warningAlertsCount,
    affectedSourcesCount,
    syncingSourcesCount,
    staleSourcesCount,
    recentFailedJobsCount: recentFailedJobs.length,
    sourcesWithFailedSyncCount,
    recentFailedJobs,
    topSourcesNeedingAttention,
  };
}
