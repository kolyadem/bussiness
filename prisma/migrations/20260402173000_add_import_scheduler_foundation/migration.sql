-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceConfigId" TEXT,
    "startedByUserId" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceKey" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceFileName" TEXT,
    "importMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "payloadSizeBytes" INTEGER,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "report" TEXT NOT NULL DEFAULT '{}',
    "sourceMeta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportJob_sourceConfigId_fkey" FOREIGN KEY ("sourceConfigId") REFERENCES "ImportSourceConfig" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ImportJob" ("completedAt", "createdAt", "createdCount", "dryRun", "errorCount", "failedCount", "id", "importMode", "payloadSizeBytes", "report", "skippedCount", "sourceConfigId", "sourceFileName", "sourceKey", "sourceMeta", "sourceType", "sourceUrl", "startedAt", "startedByUserId", "status", "totalRows", "updatedAt", "updatedCount", "warningCount") SELECT "completedAt", "createdAt", "createdCount", "dryRun", "errorCount", "failedCount", "id", "importMode", "payloadSizeBytes", "report", "skippedCount", "sourceConfigId", "sourceFileName", "sourceKey", "sourceMeta", "sourceType", "sourceUrl", "startedAt", "startedByUserId", "status", "totalRows", "updatedAt", "updatedCount", "warningCount" FROM "ImportJob";
DROP TABLE "ImportJob";
ALTER TABLE "new_ImportJob" RENAME TO "ImportJob";
CREATE INDEX "ImportJob_sourceConfigId_status_createdAt_idx" ON "ImportJob"("sourceConfigId", "status", "createdAt");
CREATE TABLE "new_ImportSourceConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "endpointUrl" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'NONE',
    "authToken" TEXT,
    "authHeaders" TEXT NOT NULL DEFAULT '{}',
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "retryCount" INTEGER NOT NULL DEFAULT 1,
    "maxRows" INTEGER NOT NULL DEFAULT 500,
    "maxPayloadBytes" INTEGER NOT NULL DEFAULT 5242880,
    "defaultImportMode" TEXT NOT NULL DEFAULT 'UPSERT',
    "skuFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slugFallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSyncing" BOOLEAN NOT NULL DEFAULT false,
    "syncLockedAt" DATETIME,
    "frequency" TEXT,
    "nextSyncAt" DATETIME,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "lastJobId" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ImportSourceConfig" ("authHeaders", "authToken", "authType", "createdAt", "createdByUserId", "defaultImportMode", "endpointUrl", "frequency", "id", "isActive", "key", "lastSyncAt", "maxPayloadBytes", "maxRows", "name", "nextSyncAt", "retryCount", "skuFallbackEnabled", "slugFallbackEnabled", "sourceType", "timeoutMs", "updatedAt", "updatedByUserId") SELECT "authHeaders", "authToken", "authType", "createdAt", "createdByUserId", "defaultImportMode", "endpointUrl", "frequency", "id", "isActive", "key", "lastSyncAt", "maxPayloadBytes", "maxRows", "name", "nextSyncAt", "retryCount", "skuFallbackEnabled", "slugFallbackEnabled", "sourceType", "timeoutMs", "updatedAt", "updatedByUserId" FROM "ImportSourceConfig";
DROP TABLE "ImportSourceConfig";
ALTER TABLE "new_ImportSourceConfig" RENAME TO "ImportSourceConfig";
CREATE UNIQUE INDEX "ImportSourceConfig_key_key" ON "ImportSourceConfig"("key");
CREATE INDEX "ImportSourceConfig_isActive_nextSyncAt_isSyncing_idx" ON "ImportSourceConfig"("isActive", "nextSyncAt", "isSyncing");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

