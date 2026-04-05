-- AlterTable
ALTER TABLE "Product" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Product" ADD COLUMN "importSourceKey" TEXT;

-- CreateTable
CREATE TABLE "ImportSourceConfig" (
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
    "frequency" TEXT,
    "nextSyncAt" DATETIME,
    "lastSyncAt" DATETIME,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceConfigId" TEXT,
    "startedByUserId" TEXT,
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

-- CreateTable
CREATE TABLE "ImportJobIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "rowIndex" INTEGER,
    "severity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rawIdentifier" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportJobIssue_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportSourceConfig_key_key" ON "ImportSourceConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Product_importSourceKey_externalId_key" ON "Product"("importSourceKey", "externalId");

