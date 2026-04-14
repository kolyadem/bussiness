-- Формула збірки: assemblyBaseFeeUah + assemblyPercent% від комплектуючих.
-- Колишня сума pcAssemblyServiceFeeUah переноситься у фіксовану частину.

ALTER TABLE "SiteSettings" ADD COLUMN "assemblyBaseFeeUah" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SiteSettings" ADD COLUMN "assemblyPercent" INTEGER NOT NULL DEFAULT 0;

UPDATE "SiteSettings" SET "assemblyBaseFeeUah" = COALESCE("pcAssemblyServiceFeeUah", 0);

ALTER TABLE "SiteSettings" DROP COLUMN "pcAssemblyServiceFeeUah";
