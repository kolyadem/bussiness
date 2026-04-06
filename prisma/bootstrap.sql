-- LEGACY: SQLite-only scratch schema. The app uses PostgreSQL + `prisma/migrations/`.
-- Do not run this against Neon; use `npx prisma migrate deploy` instead.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "passwordHash" TEXT,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
  "locale" TEXT NOT NULL DEFAULT 'uk',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Brand" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "logo" TEXT,
  "website" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Brand_slug_key" ON "Brand"("slug");

CREATE TABLE IF NOT EXISTS "BrandTranslation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "brandId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "summary" TEXT,
  CONSTRAINT "BrandTranslation_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BrandTranslation_brandId_locale_key" ON "BrandTranslation"("brandId","locale");

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "parentId" TEXT,
  "image" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

CREATE TABLE IF NOT EXISTS "CategoryTranslation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "categoryId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  CONSTRAINT "CategoryTranslation_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId","locale");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "price" INTEGER NOT NULL,
  "oldPrice" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "inventoryStatus" TEXT NOT NULL DEFAULT 'IN_STOCK',
  "stock" INTEGER NOT NULL DEFAULT 0,
  "heroImage" TEXT NOT NULL,
  "gallery" TEXT NOT NULL,
  "specs" TEXT NOT NULL,
  "metadata" TEXT NOT NULL,
  "wattage" INTEGER,
  "tdp" INTEGER,
  "lengthMm" INTEGER,
  "maxGpuLengthMm" INTEGER,
  "coolerHeightMm" INTEGER,
  "maxCoolerMm" INTEGER,
  "memoryType" TEXT,
  "socket" TEXT,
  "formFactor" TEXT,
  "supportedSockets" TEXT,
  "memorySlots" INTEGER,
  "memoryCapacityGb" INTEGER,
  "memorySpeedMhz" INTEGER,
  "psuFormFactor" TEXT,
  "storageInterface" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Product_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");

CREATE TABLE IF NOT EXISTS "ProductTranslation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "shortDescription" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  CONSTRAINT "ProductTranslation_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId","locale");

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "userId" TEXT,
  "author" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Review_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Cart" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Cart_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Cart_userId_key" ON "Cart"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Cart_sessionId_key" ON "Cart"("sessionId");

CREATE TABLE IF NOT EXISTS "CartItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cartId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "configuration" TEXT,
  "configurationKey" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "CartItem_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "Cart" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CartItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cartId_productId_configurationKey_key" ON "CartItem"("cartId","productId","configurationKey");

CREATE TABLE IF NOT EXISTS "WishlistItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT,
  "productId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WishlistItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "WishlistItem_userId_productId_key" ON "WishlistItem"("userId","productId");
CREATE UNIQUE INDEX IF NOT EXISTS "WishlistItem_sessionId_productId_key" ON "WishlistItem"("sessionId","productId");

CREATE TABLE IF NOT EXISTS "CompareItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "sessionId" TEXT,
  "productId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompareItem_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompareItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompareItem_userId_productId_key" ON "CompareItem"("userId","productId");
CREATE UNIQUE INDEX IF NOT EXISTS "CompareItem_sessionId_productId_key" ON "CompareItem"("sessionId","productId");

CREATE TABLE IF NOT EXISTS "Banner" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT 1,
  "image" TEXT,
  "href" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "Banner_key_key" ON "Banner"("key");

CREATE TABLE IF NOT EXISTS "BannerTranslation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "bannerId" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "ctaLabel" TEXT,
  CONSTRAINT "BannerTranslation_bannerId_fkey"
    FOREIGN KEY ("bannerId") REFERENCES "Banner" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BannerTranslation_bannerId_locale_key" ON "BannerTranslation"("bannerId","locale");

CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "siteMode" TEXT NOT NULL DEFAULT 'PC_BUILD',
  "brandName" TEXT NOT NULL,
  "logoText" TEXT NOT NULL,
  "supportEmail" TEXT NOT NULL,
  "supportPhone" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "facebookUrl" TEXT,
  "instagramUrl" TEXT,
  "telegramUrl" TEXT,
  "youtubeUrl" TEXT,
  "metaTitle" TEXT NOT NULL,
  "metaDescription" TEXT NOT NULL,
  "faviconPath" TEXT,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
  "defaultLocale" TEXT NOT NULL DEFAULT 'uk',
  "watermarkText" TEXT NOT NULL DEFAULT 'Lumina',
  "heroTitle" TEXT NOT NULL,
  "heroSubtitle" TEXT NOT NULL,
  "heroCtaLabel" TEXT NOT NULL,
  "heroCtaHref" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
