-- Storefront hot paths: fewer sequential scans, cheaper joins for catalog / ratings.

-- Published catalog: filter + sort by category and recency
CREATE INDEX IF NOT EXISTS "Product_published_category_created_idx"
ON "Product" ("categoryId", "createdAt" DESC)
WHERE "status" = 'PUBLISHED';

-- Published catalog: price sorts within category
CREATE INDEX IF NOT EXISTS "Product_published_category_price_idx"
ON "Product" ("categoryId", "price" ASC, "createdAt" DESC)
WHERE "status" = 'PUBLISHED';

-- Availability filters (inventory) within category
CREATE INDEX IF NOT EXISTS "Product_published_category_inventory_idx"
ON "Product" ("categoryId", "inventoryStatus")
WHERE "status" = 'PUBLISHED';

-- Sidebar category counts: group by category for published rows
CREATE INDEX IF NOT EXISTS "Product_published_category_count_idx"
ON "Product" ("categoryId")
WHERE "status" = 'PUBLISHED';

-- Aggregated ratings for product lists (JOIN + AVG on approved reviews)
CREATE INDEX IF NOT EXISTS "Review_product_approved_idx"
ON "Review" ("productId")
WHERE "status" = 'APPROVED';
