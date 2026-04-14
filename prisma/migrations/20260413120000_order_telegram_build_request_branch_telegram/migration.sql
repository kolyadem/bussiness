-- AlterTable
ALTER TABLE "Order" ADD COLUMN "telegramUsername" TEXT;

-- AlterTable
ALTER TABLE "PcBuildRequest" ADD COLUMN "deliveryBranch" TEXT;
ALTER TABLE "PcBuildRequest" ADD COLUMN "telegramUsername" TEXT;
