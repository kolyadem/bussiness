ALTER TABLE "PcBuildRequest" ADD COLUMN "managerNote" TEXT;

CREATE INDEX "PcBuildRequest_status_createdAt_idx" ON "PcBuildRequest"("status", "createdAt");
CREATE INDEX "PcBuildRequest_updatedAt_idx" ON "PcBuildRequest"("updatedAt");
