/**
 * Dev-only: B1 catalog rating path — compare Prisma count, raw SQL COUNT, pagination sums, sample products.
 *
 * Must stay in sync with `buildCatalogProductWhereSql` and the `where` / filter logic in `getCatalogData`
 * (`lib/storefront/queries.ts`). If catalog filters change, update the duplicated helpers here or this check lies.
 *
 * Run: npm run verify:b1
 */
import { Prisma } from "@prisma/client";
import { displayPriceToStoredMinorUnits } from "@/lib/utils";
import { db } from "@/lib/db";
import {
  getCatalogData,
  parseCatalogSearchParams,
  type CatalogSearchParams,
  type CatalogAvailabilityOption,
} from "@/lib/storefront/queries";
import type { AppLocale } from "@/lib/constants";
import type { CategoryTreeRecord } from "@/lib/storefront/types";

const locale: AppLocale = "uk";
const catalogPageSize = 9;

function collectDescendantCategoryIds(categories: CategoryTreeRecord[], rootId: string): string[] {
  const categoryById = new Map(categories.map((c) => [c.id, c] as const));
  const collected = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = categoryById.get(currentId);
    if (!current) continue;
    for (const child of current.children) {
      if (!collected.has(child.id)) {
        collected.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return Array.from(collected);
}

/** Mirrors lib/storefront/queries.ts buildCatalogProductWhereSql */
function buildCatalogProductWhereSql(params: {
  allowedCategoryIds: string[] | null;
  brands: string[];
  availability: CatalogAvailabilityOption[];
  minPriceStored: number | null;
  maxPriceStored: number | null;
  onSaleOnly: boolean;
  localizedQuery: string;
  locale: AppLocale;
}): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`p."status" = 'PUBLISHED'`];
  if (params.allowedCategoryIds && params.allowedCategoryIds.length > 0) {
    parts.push(
      Prisma.sql`p."categoryId" IN (${Prisma.join(
        params.allowedCategoryIds.map((id) => Prisma.sql`${id}`),
      )})`,
    );
  }
  if (params.brands.length > 0) {
    parts.push(
      Prisma.sql`p."brandId" IN (SELECT "id" FROM "Brand" WHERE "slug" IN (${Prisma.join(
        params.brands.map((slug) => Prisma.sql`${slug}`),
      )}))`,
    );
  }
  if (params.availability.length > 0) {
    parts.push(
      Prisma.sql`p."inventoryStatus" IN (${Prisma.join(
        params.availability.map((status) => Prisma.sql`${status}`),
      )})`,
    );
  }
  if (params.minPriceStored !== null) {
    parts.push(Prisma.sql`p."price" >= ${params.minPriceStored}`);
  }
  if (params.maxPriceStored !== null) {
    parts.push(Prisma.sql`p."price" <= ${params.maxPriceStored}`);
  }
  if (params.onSaleOnly) {
    parts.push(Prisma.sql`p."oldPrice" IS NOT NULL`);
  }
  if (params.localizedQuery.length > 0) {
    const q = params.localizedQuery;
    const loc = params.locale;
    parts.push(
      Prisma.sql`(
        p."sku" LIKE '%' || ${q} || '%'
        OR EXISTS (
          SELECT 1 FROM "ProductTranslation" pt
          WHERE pt."productId" = p."id" AND pt."locale" = ${loc}
          AND pt."name" LIKE '%' || ${q} || '%'
        )
        OR EXISTS (
          SELECT 1 FROM "Brand" b
          INNER JOIN "BrandTranslation" bt ON bt."brandId" = b."id"
          WHERE b."id" = p."brandId" AND bt."locale" = ${loc}
          AND bt."name" LIKE '%' || ${q} || '%'
        )
      )`,
    );
  }
  return Prisma.join(parts, " AND ");
}

async function loadCategoriesTree(): Promise<CategoryTreeRecord[]> {
  return db.category.findMany({
    include: {
      translations: true,
      children: { include: { translations: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { sortOrder: "asc" },
  }) as Promise<CategoryTreeRecord[]>;
}

async function resolveWhereSqlInputs(
  categories: CategoryTreeRecord[],
  params: CatalogSearchParams,
): Promise<{
  allowedCategoryIds: string[] | null;
  minPriceStored: number | null;
  maxPriceStored: number | null;
  localizedQuery: string;
}> {
  const selectedCategory = params.category
    ? categories.find((c) => c.slug === params.category) ?? null
    : null;
  const selectedSubcategory = params.subcategory
    ? categories.find((c) => c.slug === params.subcategory) ?? null
    : null;
  const localizedQuery = params.q.trim();
  const allowedCategoryIds = selectedSubcategory
    ? [selectedSubcategory.id]
    : selectedCategory
      ? collectDescendantCategoryIds(categories, selectedCategory.id)
      : null;
  const minPriceStored =
    typeof params.minPrice === "number" ? displayPriceToStoredMinorUnits(params.minPrice) : null;
  const maxPriceStored =
    typeof params.maxPrice === "number" ? displayPriceToStoredMinorUnits(params.maxPrice) : null;
  return { allowedCategoryIds, minPriceStored, maxPriceStored, localizedQuery };
}

async function rawSqlCount(whereSql: Prisma.Sql): Promise<number> {
  const rows = await db.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS c FROM "Product" p WHERE ${whereSql}
  `);
  return Number(rows[0]?.c ?? 0);
}

async function prismaCountForCatalog(
  categories: CategoryTreeRecord[],
  params: CatalogSearchParams,
): Promise<number> {
  const selectedCategory = params.category
    ? categories.find((c) => c.slug === params.category) ?? null
    : null;
  const selectedSubcategory = params.subcategory
    ? categories.find((c) => c.slug === params.subcategory) ?? null
    : null;
  const localizedQuery = params.q.trim();
  const allowedCategoryIds = selectedSubcategory
    ? [selectedSubcategory.id]
    : selectedCategory
      ? collectDescendantCategoryIds(categories, selectedCategory.id)
      : null;
  const minPriceStored =
    typeof params.minPrice === "number" ? displayPriceToStoredMinorUnits(params.minPrice) : null;
  const maxPriceStored =
    typeof params.maxPrice === "number" ? displayPriceToStoredMinorUnits(params.maxPrice) : null;
  const priceFilter =
    minPriceStored !== null || maxPriceStored !== null
      ? {
          ...(minPriceStored !== null ? { gte: minPriceStored } : {}),
          ...(maxPriceStored !== null ? { lte: maxPriceStored } : {}),
        }
      : undefined;
  const where = {
    status: "PUBLISHED" as const,
    ...(allowedCategoryIds ? { categoryId: { in: allowedCategoryIds } } : {}),
    ...(params.brands.length > 0 ? { brand: { slug: { in: params.brands } } } : {}),
    ...(params.availability.length > 0 ? { inventoryStatus: { in: params.availability } } : {}),
    ...(priceFilter ? { price: priceFilter } : {}),
    ...(params.onSaleOnly ? { oldPrice: { not: null } } : {}),
    ...(params.q
      ? {
          OR: [
            { sku: { contains: localizedQuery } },
            {
              translations: {
                some: {
                  locale,
                  name: { contains: localizedQuery },
                },
              },
            },
            {
              brand: {
                translations: {
                  some: {
                    locale,
                    name: { contains: localizedQuery },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  return db.product.count({ where });
}

async function sumPagesRating(paramsBase: CatalogSearchParams, categories: CategoryTreeRecord[]) {
  const p1 = await getCatalogData({
    locale,
    params: { ...paramsBase, sort: "rating", page: 1 },
  });
  const totalItems = p1.pagination.totalItems;
  const totalPages = p1.pagination.totalPages;
  let sum = 0;
  for (let page = 1; page <= totalPages; page++) {
    const d = await getCatalogData({
      locale,
      params: { ...paramsBase, sort: "rating", page },
    });
    sum += d.products.length;
    if (page === 1 && totalItems > 0) {
      if (d.products.length > catalogPageSize) {
        throw new Error(`page 1 length ${d.products.length} > pageSize`);
      }
      if (d.products.length !== Math.min(catalogPageSize, totalItems)) {
        throw new Error(
          `page 1 expected ${Math.min(catalogPageSize, totalItems)} got ${d.products.length}`,
        );
      }
    }
  }
  return { totalItems, totalPages, sum, firstPageLen: p1.products.length };
}

async function ratingQueryIdCountForPage(
  whereSql: Prisma.Sql,
  limit: number,
  offset: number,
): Promise<number> {
  const rows = await db.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS c FROM (
      SELECT p."id"
      FROM "Product" p
      LEFT JOIN (
        SELECT "productId", AVG("rating") AS avg_rating
        FROM "Review"
        WHERE "status" = 'APPROVED'
        GROUP BY "productId"
      ) rev ON rev."productId" = p."id"
      WHERE ${whereSql}
      ORDER BY COALESCE(rev.avg_rating, 0) DESC, p."createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    ) t
  `);
  return Number(rows[0]?.c ?? 0);
}

async function main() {
  const categories = await loadCategoriesTree();
  const published = await db.product.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, slug: true, createdAt: true },
  });
  const firstCat = categories[0];
  const firstBrand = await db.brand.findFirst({
    where: { products: { some: { status: "PUBLISHED" } } },
    select: { slug: true },
  });
  const priceBounds = await db.product.aggregate({
    where: { status: "PUBLISHED" },
    _min: { price: true },
    _max: { price: true },
  });
  const minP = priceBounds._min.price ?? 0;
  const maxP = priceBounds._max.price ?? minP;
  const midPrice = Math.floor((minP + maxP) / 2);

  const scenarios: Array<{ name: string; raw: Record<string, string | string[] | undefined> }> = [
    { name: "no filters", raw: { sort: "rating", page: "1" } },
  ];
  if (firstCat) {
    scenarios.push({
      name: `category=${firstCat.slug}`,
      raw: { sort: "rating", page: "1", category: firstCat.slug },
    });
  }
  if (firstBrand?.slug) {
    scenarios.push({
      name: `brand=${firstBrand.slug}`,
      raw: { sort: "rating", page: "1", brand: firstBrand.slug },
    });
  }
  scenarios.push({
    name: `price min-max (stored ~mid)`,
    raw: {
      sort: "rating",
      page: "1",
      minPrice: String(Math.max(1, Math.floor(midPrice / 100))),
      maxPrice: String(Math.max(1, Math.ceil(maxP / 100))),
    },
  });
  scenarios.push({
    name: "sale=1",
    raw: { sort: "rating", page: "1", sale: "1" },
  });
  const searchQ =
    published[0]?.slug?.slice(0, 3) && published[0].slug.length >= 3
      ? published[0].slug.slice(0, 3)
      : "a";
  scenarios.push({
    name: `search q=${JSON.stringify(searchQ)}`,
    raw: { sort: "rating", page: "1", q: searchQ },
  });

  console.log("=== 1) count vs pagination sum vs raw SQL count vs rating subquery row count ===\n");
  for (const { name, raw } of scenarios) {
    const params = parseCatalogSearchParams(raw);
    const inputs = await resolveWhereSqlInputs(categories, params);
    const whereSql = buildCatalogProductWhereSql({
      allowedCategoryIds: inputs.allowedCategoryIds,
      brands: params.brands,
      availability: params.availability,
      minPriceStored: inputs.minPriceStored,
      maxPriceStored: inputs.maxPriceStored,
      onSaleOnly: params.onSaleOnly,
      localizedQuery: inputs.localizedQuery,
      locale,
    });
    const prismaC = await prismaCountForCatalog(categories, params);
    const rawC = await rawSqlCount(whereSql);
    const { totalItems, sum, totalPages, firstPageLen } = await sumPagesRating(params, categories);
    const ratingPageIds = await ratingQueryIdCountForPage(whereSql, catalogPageSize, 0);
    const loadedFirst = (
      await getCatalogData({ locale, params: { ...params, sort: "rating", page: 1 } })
    ).products.length;

    const match = prismaC === rawC && prismaC === totalItems && sum === totalItems;
    console.log(`[${name}]`);
    console.log(
      `  prisma count=${prismaC} rawSql count=${rawC} pagination.totalItems=${totalItems} sum(all pages)=${sum} totalPages=${totalPages}`,
    );
    console.log(
      `  page1: rating SQL row count (limit ${catalogPageSize} offset 0)=${ratingPageIds} findMany+reorder length=${loadedFirst} firstPageLen check=${firstPageLen}`,
    );
    console.log(`  OK: ${match ? "YES" : "NO"}\n`);
  }

  console.log("=== 2) Products: no APPROVED / only non-APPROVED / has APPROVED ===\n");
  const withApproved = await db.review.groupBy({
    by: ["productId"],
    where: { status: "APPROVED" },
    _count: { _all: true },
  });
  const withApprovedSet = new Set(withApproved.map((r) => r.productId));
  const anyReview = await db.review.groupBy({
    by: ["productId"],
    _count: { _all: true },
  });
  const anyReviewSet = new Set(anyReview.map((r) => r.productId));

  const noReviewsEver = published.find((p) => !anyReviewSet.has(p.id));
  const onlyNonApproved = await db.$queryRaw<Array<{ productId: string }>>`
    SELECT r."productId" FROM "Review" r
    GROUP BY r."productId"
    HAVING SUM(CASE WHEN r."status" = 'APPROVED' THEN 1 ELSE 0 END) = 0
    AND COUNT(*) > 0
    LIMIT 1
  `;
  const pidNonApproved = onlyNonApproved[0]?.productId;
  const withApprovedProduct = published.find((p) => withApprovedSet.has(p.id));

  async function explain(label: string, pid: string | undefined) {
    if (!pid) {
      console.log(`${label}: (no matching product in DB — skip ordering check)`);
      return;
    }
    const rows = await db.$queryRaw<
      Array<{ id: string; avg_r: number | null; createdAt: Date }>
    >(Prisma.sql`
      SELECT p."id", rev.avg_rating AS avg_r, p."createdAt"
      FROM "Product" p
      LEFT JOIN (
        SELECT "productId", AVG("rating") AS avg_rating
        FROM "Review"
        WHERE "status" = 'APPROVED'
        GROUP BY "productId"
      ) rev ON rev."productId" = p."id"
      WHERE p."id" = ${pid}
    `);
    const r = rows[0];
    console.log(
      `${label} id=${pid} COALESCE(avg_approved,0)=${r ? Number(r.avg_r ?? 0) : "n/a"}`,
    );
  }

  await explain("no reviews at all", noReviewsEver?.id);
  await explain("only non-APPROVED reviews", pidNonApproved);
  await explain("has APPROVED reviews", withApprovedProduct?.id);

  if (noReviewsEver && withApprovedProduct) {
    const cmp = await db.$queryRaw<Array<{ a: number; b: number }>>(Prisma.sql`
      SELECT
        (SELECT COALESCE((SELECT AVG("rating") FROM "Review" WHERE "productId" = ${noReviewsEver.id} AND "status" = 'APPROVED'), 0)) AS a,
        (SELECT COALESCE((SELECT AVG("rating") FROM "Review" WHERE "productId" = ${withApprovedProduct.id} AND "status" = 'APPROVED'), 0)) AS b
    `);
    console.log(
      `\n  effective rating no-reviews product: ${cmp[0]?.a}  vs  has-APPROVED product: ${cmp[0]?.b}  => higher rating sorts first: ${Number(cmp[0]?.b) > Number(cmp[0]?.a) ? "YES" : "NO or equal"}`,
    );
  }

  console.log("\n=== 3) Tie-break createdAt desc (same avg_rating) ===\n");
  const tie = await db.$queryRaw<Array<{ c: bigint }>>(Prisma.sql`
    SELECT COUNT(*) AS c FROM (
      SELECT rev.avg_rating
      FROM "Product" p
      LEFT JOIN (
        SELECT "productId", AVG("rating") AS avg_rating
        FROM "Review"
        WHERE "status" = 'APPROVED'
        GROUP BY "productId"
      ) rev ON rev."productId" = p."id"
      WHERE p."status" = 'PUBLISHED'
      GROUP BY COALESCE(rev.avg_rating, 0)
      HAVING COUNT(*) > 1
    ) x
  `);
  const tieGroups = Number(tie[0]?.c ?? 0);
  console.log(
    `  Published products sharing same COALESCE(avg,0) value (groups with >1 product): ${tieGroups} (if 0, no pair in DB to demonstrate tie-break empirically)`,
  );

  const pair = await db.$queryRaw<Array<{ id1: string; id2: string; av: number }>>(Prisma.sql`
    WITH rated AS (
      SELECT p."id", p."createdAt", COALESCE(rev.avg_rating, 0) AS av
      FROM "Product" p
      LEFT JOIN (
        SELECT "productId", AVG("rating") AS avg_rating
        FROM "Review"
        WHERE "status" = 'APPROVED'
        GROUP BY "productId"
      ) rev ON rev."productId" = p."id"
      WHERE p."status" = 'PUBLISHED'
    )
    SELECT a."id" AS id1, b."id" AS id2, a.av AS av
    FROM rated a
    JOIN rated b ON a.av = b.av AND a."id" < b."id" AND a."createdAt" > b."createdAt"
    LIMIT 1
  `);
  if (pair.length > 0) {
    const { id1, id2, av } = pair[0];
    console.log(
      `  Example pair same av=${av}: newer id=${id1} createdAt > older id=${id2} — ORDER BY createdAt DESC puts ${id1} first: OK (pair exists)`,
    );
  } else {
    console.log(
      `  No pair found with same avg and different createdAt in sample query — tie-break not empirically shown on this dataset.`,
    );
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
