-- CreateTable
CREATE TABLE "PriceUpdateRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW_READY',
    "createdByUserId" TEXT,
    "appliedByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "appliedAt" DATETIME,
    CONSTRAINT "PriceUpdateRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceUpdateRun_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceUpdateLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "currencySnapshot" TEXT NOT NULL,
    "priceBeforeStored" INTEGER NOT NULL,
    "rozetkaPriceUah" INTEGER,
    "telemartPriceUah" INTEGER,
    "baseSource" TEXT,
    "basePriceUah" INTEGER,
    "newPriceStored" INTEGER,
    "rozetkaUrl" TEXT,
    "telemartUrl" TEXT,
    "matchNote" TEXT NOT NULL DEFAULT '',
    "confidence" TEXT NOT NULL DEFAULT 'NONE',
    "lineStatus" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
    "userApproved" BOOLEAN NOT NULL DEFAULT false,
    "appliedAt" DATETIME,
    CONSTRAINT "PriceUpdateLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PriceUpdateRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceUpdateLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceChangeHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT,
    "lineId" TEXT,
    "productId" TEXT NOT NULL,
    "previousPriceStored" INTEGER NOT NULL,
    "newPriceStored" INTEGER NOT NULL,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedByUserId" TEXT,
    "rolledBackAt" DATETIME,
    "rolledBackByUserId" TEXT,
    CONSTRAINT "PriceChangeHistory_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PriceUpdateRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceChangeHistory_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PriceUpdateLine" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceChangeHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PriceChangeHistory_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PriceChangeHistory_rolledBackByUserId_fkey" FOREIGN KEY ("rolledBackByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PriceChangeHistory_lineId_key" ON "PriceChangeHistory"("lineId");
CREATE INDEX "PriceUpdateLine_runId_idx" ON "PriceUpdateLine"("runId");
CREATE INDEX "PriceUpdateLine_productId_idx" ON "PriceUpdateLine"("productId");
CREATE INDEX "PriceChangeHistory_productId_idx" ON "PriceChangeHistory"("productId");
CREATE INDEX "PriceChangeHistory_runId_idx" ON "PriceChangeHistory"("runId");
