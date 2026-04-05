-- AlterTable
ALTER TABLE "PriceUpdateLine" ADD COLUMN "rozetkaAvailability" TEXT NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "PriceUpdateLine" ADD COLUMN "telemartAvailability" TEXT NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "PriceUpdateLine" ADD COLUMN "candidateAvailability" TEXT NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "PriceUpdateLine" ADD COLUMN "availabilityRationale" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "PriceUpdateLine" ADD COLUMN "inventoryStatusSnapshot" TEXT NOT NULL DEFAULT 'IN_STOCK';

-- AlterTable
ALTER TABLE "PriceChangeHistory" ADD COLUMN "previousInventoryStatus" TEXT;

-- AlterTable
ALTER TABLE "PriceChangeHistory" ADD COLUMN "newInventoryStatus" TEXT;
