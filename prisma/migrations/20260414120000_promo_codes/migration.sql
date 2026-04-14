-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('PERCENT_DISCOUNT', 'FIXED_DISCOUNT', 'FREE_BUILD');

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "pcAssemblyServiceFeeUah" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "codeKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "PromoCodeType" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_codeKey_key" ON "PromoCode"("codeKey");

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN "promoCodeId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "promoCodeId" TEXT,
ADD COLUMN "promoCodeCodeSnapshot" TEXT,
ADD COLUMN "promoDiscountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "promoEffectType" "PromoCodeType";

-- AlterTable
ALTER TABLE "PcBuildRequest" ADD COLUMN "promoCodeId" TEXT,
ADD COLUMN "promoCodeCodeSnapshot" TEXT,
ADD COLUMN "promoDiscountAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "promoEffectType" "PromoCodeType";

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuildRequest" ADD CONSTRAINT "PcBuildRequest_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Cart_promoCodeId_idx" ON "Cart"("promoCodeId");

-- CreateIndex
CREATE INDEX "Order_promoCodeId_idx" ON "Order"("promoCodeId");

-- CreateIndex
CREATE INDEX "PcBuildRequest_promoCodeId_idx" ON "PcBuildRequest"("promoCodeId");
