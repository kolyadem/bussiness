-- CreateTable
CREATE TABLE "ImportAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceConfigId" TEXT NOT NULL,
    "jobId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "acknowledgedAt" DATETIME,
    "acknowledgedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ImportAlert_sourceConfigId_fkey" FOREIGN KEY ("sourceConfigId") REFERENCES "ImportSourceConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ImportAlert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ImportAlert_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ImportAlert_sourceConfigId_status_type_idx" ON "ImportAlert"("sourceConfigId", "status", "type");

-- CreateIndex
CREATE INDEX "ImportAlert_status_severity_lastDetectedAt_idx" ON "ImportAlert"("status", "severity", "lastDetectedAt");
