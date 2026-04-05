ALTER TABLE "Order" ADD COLUMN "managerNote" TEXT;
UPDATE "Order" SET "status" = 'PROCESSING' WHERE "status" = 'IN_PROGRESS';
