-- Default new rows to UAH; migrate legacy USD-stored product prices to UAH kopiyky (same display amounts).

ALTER TABLE "Product" ALTER COLUMN "currency" SET DEFAULT 'UAH';
ALTER TABLE "Order" ALTER COLUMN "currency" SET DEFAULT 'UAH';
ALTER TABLE "OrderItem" ALTER COLUMN "currency" SET DEFAULT 'UAH';
ALTER TABLE "PcBuildRequest" ALTER COLUMN "currency" SET DEFAULT 'UAH';
ALTER TABLE "SiteSettings" ALTER COLUMN "defaultCurrency" SET DEFAULT 'UAH';

UPDATE "SiteSettings" SET "defaultCurrency" = 'UAH' WHERE "defaultCurrency" = 'USD';

UPDATE "Product"
SET
  "price" = ROUND("price"::numeric * 41)::int,
  "purchasePrice" = CASE
    WHEN "purchasePrice" IS NOT NULL THEN ROUND("purchasePrice"::numeric * 41)::int
    ELSE NULL
  END,
  "oldPrice" = CASE
    WHEN "oldPrice" IS NOT NULL THEN ROUND("oldPrice"::numeric * 41)::int
    ELSE NULL
  END,
  "currency" = 'UAH'
WHERE "currency" = 'USD';

UPDATE "PcBuild" AS b
SET "totalPrice" = COALESCE(sub.sum, 0)
FROM (
  SELECT i."buildId", SUM(i."quantity" * p."price")::int AS sum
  FROM "PcBuildItem" i
  JOIN "Product" p ON p."id" = i."productId"
  GROUP BY i."buildId"
) AS sub
WHERE b."id" = sub."buildId";

UPDATE "PcBuildRequest" r
SET
  "totalPrice" = b."totalPrice",
  "currency" = 'UAH'
FROM "PcBuild" b
WHERE r."buildId" = b."id"
  AND r."itemsSnapshot" IS NOT NULL
  AND r."itemsSnapshot" <> '[]';

UPDATE "PcBuildRequest" SET "currency" = 'UAH' WHERE "currency" = 'USD';
