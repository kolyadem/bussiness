ALTER TABLE "Order" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryBranch" TEXT;

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_CartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "configuration" TEXT,
    CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_CartItem" ("id", "cartId", "productId", "quantity", "configuration")
SELECT "id", "cartId", "productId", "quantity", "configuration"
FROM "CartItem";

DROP TABLE "CartItem";
ALTER TABLE "new_CartItem" RENAME TO "CartItem";

CREATE INDEX "CartItem_cartId_productId_idx" ON "CartItem"("cartId", "productId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
