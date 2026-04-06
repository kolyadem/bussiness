-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SiteMode" AS ENUM ('STORE', 'PC_BUILD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "canAccessPriceUpdates" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'uk',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandTranslation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,

    CONSTRAINT "BrandTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "externalId" TEXT,
    "importSourceKey" TEXT,
    "categoryId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "price" INTEGER NOT NULL,
    "purchasePrice" INTEGER,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceUpdateRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW_READY',
    "createdByUserId" TEXT,
    "appliedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "PriceUpdateRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceUpdateLine" (
    "id" TEXT NOT NULL,
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
    "appliedAt" TIMESTAMP(3),
    "rozetkaAvailability" TEXT NOT NULL DEFAULT 'unknown',
    "telemartAvailability" TEXT NOT NULL DEFAULT 'unknown',
    "candidateAvailability" TEXT NOT NULL DEFAULT 'unknown',
    "availabilityRationale" TEXT NOT NULL DEFAULT '',
    "inventoryStatusSnapshot" TEXT NOT NULL DEFAULT 'IN_STOCK',

    CONSTRAINT "PriceUpdateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChangeHistory" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "lineId" TEXT,
    "productId" TEXT NOT NULL,
    "previousPriceStored" INTEGER NOT NULL,
    "newPriceStored" INTEGER NOT NULL,
    "previousInventoryStatus" TEXT,
    "newInventoryStatus" TEXT,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedByUserId" TEXT,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackByUserId" TEXT,

    CONSTRAINT "PriceChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "author" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompareItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompareItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "configuration" TEXT,
    "configurationKey" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "comment" TEXT,
    "managerNote" TEXT,
    "deliveryCity" TEXT,
    "deliveryMethod" TEXT,
    "deliveryAddress" TEXT,
    "deliveryBranch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "totalCost" INTEGER,
    "grossProfit" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "unitCost" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "productName" TEXT NOT NULL,
    "productSlug" TEXT,
    "heroImage" TEXT,
    "brandName" TEXT,
    "configuration" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcBuild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'uk',
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "shareToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcBuild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcBuildItem" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PcBuildItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PcBuildRequest" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "userId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'uk',
    "customerName" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "budget" INTEGER,
    "useCase" TEXT,
    "preferences" TEXT,
    "needsMonitor" BOOLEAN NOT NULL DEFAULT false,
    "needsPeripherals" BOOLEAN NOT NULL DEFAULT false,
    "needsUpgrade" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "managerNote" TEXT,
    "deliveryCity" TEXT,
    "deliveryMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalPrice" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "itemsSnapshot" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PcBuildRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityRule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "sourceSlot" TEXT NOT NULL,
    "targetSlot" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'ATTRIBUTE',
    "targetType" TEXT NOT NULL DEFAULT 'ATTRIBUTE',
    "sourceAttributeId" TEXT,
    "sourceValue" TEXT,
    "targetAttributeId" TEXT,
    "targetValue" TEXT,
    "comparator" TEXT NOT NULL,
    "messageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "siteMode" "SiteMode" NOT NULL DEFAULT 'STORE',
    "brandName" TEXT NOT NULL,
    "shortBrandName" TEXT,
    "logoText" TEXT NOT NULL,
    "logoPath" TEXT,
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
    "featuredCategorySlugs" TEXT NOT NULL DEFAULT '[]',
    "featuredProductIds" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportSourceConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "endpointUrl" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'NONE',
    "authToken" TEXT,
    "authHeaders" TEXT NOT NULL DEFAULT '{}',
    "timeoutMs" INTEGER NOT NULL DEFAULT 15000,
    "retryCount" INTEGER NOT NULL DEFAULT 1,
    "maxRows" INTEGER NOT NULL DEFAULT 500,
    "maxPayloadBytes" INTEGER NOT NULL DEFAULT 5242880,
    "defaultImportMode" TEXT NOT NULL DEFAULT 'UPSERT',
    "skuFallbackEnabled" BOOLEAN NOT NULL DEFAULT true,
    "slugFallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSyncing" BOOLEAN NOT NULL DEFAULT false,
    "syncLockedAt" TIMESTAMP(3),
    "frequency" TEXT,
    "nextSyncAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncError" TEXT,
    "lastJobId" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportSourceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "sourceConfigId" TEXT,
    "startedByUserId" TEXT,
    "triggerType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceKey" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "sourceFileName" TEXT,
    "importMode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "payloadSizeBytes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "report" TEXT NOT NULL DEFAULT '{}',
    "sourceMeta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobIssue" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rowIndex" INTEGER,
    "severity" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "rawIdentifier" TEXT,
    "details" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJobIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportAlert" (
    "id" TEXT NOT NULL,
    "sourceConfigId" TEXT NOT NULL,
    "jobId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 1,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT,
    "href" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BannerTranslation" (
    "id" TEXT NOT NULL,
    "bannerId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "ctaLabel" TEXT,

    CONSTRAINT "BannerTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_login_key" ON "User"("login");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BrandTranslation_brandId_locale_key" ON "BrandTranslation"("brandId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_importSourceKey_externalId_key" ON "Product"("importSourceKey", "externalId");

-- CreateIndex
CREATE INDEX "PriceUpdateLine_runId_idx" ON "PriceUpdateLine"("runId");

-- CreateIndex
CREATE INDEX "PriceUpdateLine_productId_idx" ON "PriceUpdateLine"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceChangeHistory_lineId_key" ON "PriceChangeHistory"("lineId");

-- CreateIndex
CREATE INDEX "PriceChangeHistory_productId_idx" ON "PriceChangeHistory"("productId");

-- CreateIndex
CREATE INDEX "PriceChangeHistory_runId_idx" ON "PriceChangeHistory"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation"("productId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_code_key" ON "ProductAttribute"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_attributeId_productId_key" ON "ProductAttributeValue"("attributeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_sessionId_productId_key" ON "WishlistItem"("sessionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_userId_productId_key" ON "CompareItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CompareItem_sessionId_productId_key" ON "CompareItem"("sessionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "Cart"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_sessionId_key" ON "Cart"("sessionId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_productId_idx" ON "CartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_configurationKey_key" ON "CartItem"("cartId", "productId", "configurationKey");

-- CreateIndex
CREATE UNIQUE INDEX "PcBuild_slug_key" ON "PcBuild"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PcBuild_shareToken_key" ON "PcBuild"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "PcBuildItem_buildId_slot_key" ON "PcBuildItem"("buildId", "slot");

-- CreateIndex
CREATE INDEX "PcBuildRequest_status_createdAt_idx" ON "PcBuildRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PcBuildRequest_updatedAt_idx" ON "PcBuildRequest"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompatibilityRule_code_key" ON "CompatibilityRule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ImportSourceConfig_key_key" ON "ImportSourceConfig"("key");

-- CreateIndex
CREATE INDEX "ImportSourceConfig_isActive_nextSyncAt_isSyncing_idx" ON "ImportSourceConfig"("isActive", "nextSyncAt", "isSyncing");

-- CreateIndex
CREATE INDEX "ImportJob_sourceConfigId_status_createdAt_idx" ON "ImportJob"("sourceConfigId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ImportAlert_sourceConfigId_status_type_idx" ON "ImportAlert"("sourceConfigId", "status", "type");

-- CreateIndex
CREATE INDEX "ImportAlert_status_severity_lastDetectedAt_idx" ON "ImportAlert"("status", "severity", "lastDetectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Banner_key_key" ON "Banner"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BannerTranslation_bannerId_locale_key" ON "BannerTranslation"("bannerId", "locale");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandTranslation" ADD CONSTRAINT "BrandTranslation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdateRun" ADD CONSTRAINT "PriceUpdateRun_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdateRun" ADD CONSTRAINT "PriceUpdateRun_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdateLine" ADD CONSTRAINT "PriceUpdateLine_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PriceUpdateRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdateLine" ADD CONSTRAINT "PriceUpdateLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeHistory" ADD CONSTRAINT "PriceChangeHistory_runId_fkey" FOREIGN KEY ("runId") REFERENCES "PriceUpdateRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeHistory" ADD CONSTRAINT "PriceChangeHistory_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "PriceUpdateLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeHistory" ADD CONSTRAINT "PriceChangeHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeHistory" ADD CONSTRAINT "PriceChangeHistory_appliedByUserId_fkey" FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChangeHistory" ADD CONSTRAINT "PriceChangeHistory_rolledBackByUserId_fkey" FOREIGN KEY ("rolledBackByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompareItem" ADD CONSTRAINT "CompareItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompareItem" ADD CONSTRAINT "CompareItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuild" ADD CONSTRAINT "PcBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuildItem" ADD CONSTRAINT "PcBuildItem_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "PcBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuildItem" ADD CONSTRAINT "PcBuildItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuildRequest" ADD CONSTRAINT "PcBuildRequest_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "PcBuild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PcBuildRequest" ADD CONSTRAINT "PcBuildRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityRule" ADD CONSTRAINT "CompatibilityRule_sourceAttributeId_fkey" FOREIGN KEY ("sourceAttributeId") REFERENCES "ProductAttribute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityRule" ADD CONSTRAINT "CompatibilityRule_targetAttributeId_fkey" FOREIGN KEY ("targetAttributeId") REFERENCES "ProductAttribute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_sourceConfigId_fkey" FOREIGN KEY ("sourceConfigId") REFERENCES "ImportSourceConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJobIssue" ADD CONSTRAINT "ImportJobIssue_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAlert" ADD CONSTRAINT "ImportAlert_sourceConfigId_fkey" FOREIGN KEY ("sourceConfigId") REFERENCES "ImportSourceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAlert" ADD CONSTRAINT "ImportAlert_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportAlert" ADD CONSTRAINT "ImportAlert_acknowledgedByUserId_fkey" FOREIGN KEY ("acknowledgedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BannerTranslation" ADD CONSTRAINT "BannerTranslation_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
