import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { PromoCode, Review } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isPrismaRecoverableBuildTimeError,
  isPrismaRecoverableReadError,
  withPrismaFallback,
} from "@/lib/prisma-build";
import { defaultLocale, inventoryLabels, type AppLocale } from "@/lib/constants";
import { getSiteSettingsRecord } from "@/lib/site-config";
import {
  displayPriceToStoredMinorUnits,
  parseJson,
  STOREFRONT_CURRENCY_CODE,
  storedMinorUnitsToDisplayPrice,
} from "@/lib/utils";
import { getSessionId } from "@/lib/session";
import { getRecentlyViewedProductIds } from "@/lib/session";
import { getNormalizedTechnicalAttributeMap } from "@/lib/configurator/technical-attributes";
import {
  getOwnedCart,
  getOwnedListItems,
  resolveStorefrontOwner,
} from "@/lib/storefront/persistence";
import { parseBuildRequestItemsSnapshot } from "@/lib/storefront/build-requests";
import { getOrderKindFromItems, normalizeOrderStatus } from "@/lib/storefront/orders";
import type {
  CartItemRecord,
  CategoryTreeRecord,
  CompareItemRecord,
  ProductRecord,
  WishlistItemRecord,
} from "@/lib/storefront/types";
import { productInclude, productListInclude } from "@/lib/storefront/product-includes";
import { resolveHeroImageSrc } from "@/lib/storefront/product-image";

export { productInclude, productListInclude };

const catalogPageSize = 9;
const catalogSortOptions = ["newest", "price-asc", "price-desc", "rating"] as const;
const catalogAvailabilityOptions = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"] as const;

export type CatalogSortOption = (typeof catalogSortOptions)[number];
export type CatalogAvailabilityOption = (typeof catalogAvailabilityOptions)[number];

export type CatalogSearchParams = {
  q: string;
  category: string | null;
  subcategory: string | null;
  availability: CatalogAvailabilityOption[];
  minPrice: number | null;
  maxPrice: number | null;
  onSaleOnly: boolean;
  sort: CatalogSortOption;
  page: number;
};

type CatalogSearchParamsInput = Record<string, string | string[] | undefined>;

function getFirstSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getSearchParamList(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function normalizePositiveNumber(value: string) {
  if (value.trim().length === 0) {
    return null;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

export function parseCatalogSearchParams(rawParams: CatalogSearchParamsInput): CatalogSearchParams {
  const q = getFirstSearchParamValue(rawParams.q).trim();
  const category = getFirstSearchParamValue(rawParams.category).trim() || null;
  const subcategoryRaw = getFirstSearchParamValue(rawParams.subcategory).trim() || null;
  /** Subcategory is only meaningful together with a parent category (see getCatalogData). */
  const subcategory = category && subcategoryRaw ? subcategoryRaw : null;
  const availability = Array.from(
    new Set(
      getSearchParamList(rawParams.availability).filter((value): value is CatalogAvailabilityOption =>
        catalogAvailabilityOptions.includes(value as CatalogAvailabilityOption),
      ),
    ),
  );
  const minPrice = normalizePositiveNumber(getFirstSearchParamValue(rawParams.minPrice));
  const maxPrice = normalizePositiveNumber(getFirstSearchParamValue(rawParams.maxPrice));
  const sortValue = getFirstSearchParamValue(rawParams.sort);
  const pageValue = Number.parseInt(getFirstSearchParamValue(rawParams.page), 10);

  return {
    q,
    category,
    subcategory,
    availability,
    minPrice,
    maxPrice,
    onSaleOnly: getFirstSearchParamValue(rawParams.sale) === "1",
    sort: catalogSortOptions.includes(sortValue as CatalogSortOption)
      ? (sortValue as CatalogSortOption)
      : "newest",
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export type CategoryParentEdge = { id: string; parentId: string | null };

/**
 * Descendant IDs for a category root using only `parentId` edges (full tree depth).
 * Matches the DB tree even if nested `children` relations are shallow in the Prisma include.
 */
export function collectDescendantCategoryIdsFromEdges(
  edges: CategoryParentEdge[],
  rootId: string,
): string[] {
  const childrenByParent = new Map<string | null, string[]>();
  for (const row of edges) {
    const key = row.parentId;
    const list = childrenByParent.get(key) ?? [];
    list.push(row.id);
    childrenByParent.set(key, list);
  }

  const collected = new Set<string>([rootId]);
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const childId of childrenByParent.get(currentId) ?? []) {
      if (!collected.has(childId)) {
        collected.add(childId);
        queue.push(childId);
      }
    }
  }

  return Array.from(collected);
}

const getCategoryParentEdgesCached = cache(
  unstable_cache(
    async (): Promise<CategoryParentEdge[]> =>
      db.category.findMany({ select: { id: true, parentId: true } }),
    ["category-parent-edges"],
    { tags: ["categories"], revalidate: 300 },
  ),
);

function buildCatalogOrderBy(sort: CatalogSortOption) {
  switch (sort) {
    case "price-asc":
      return [{ price: "asc" as const }, { createdAt: "desc" as const }];
    case "price-desc":
      return [{ price: "desc" as const }, { createdAt: "desc" as const }];
    case "newest":
    default:
      return [{ createdAt: "desc" as const }, { stock: "desc" as const }];
  }
}

/**
 * SQL WHERE matching Prisma `where` in getCatalogData (same filters as db.product.count/findMany).
 * Values are passed as bound parameters (Prisma.sql) — no string concatenation of user input.
 */
function buildCatalogProductWhereSql(params: {
  allowedCategoryIds: string[] | null;
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
      )`,
    );
  }

  return Prisma.join(parts, " AND ");
}

async function queryCatalogRatingPageIds(params: {
  whereSql: Prisma.Sql;
  limit: number;
  offset: number;
}): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p."id"
    FROM "Product" p
    LEFT JOIN (
      SELECT "productId", AVG("rating") AS avg_rating
      FROM "Review"
      WHERE "status" = 'APPROVED'
      GROUP BY "productId"
    ) rev ON rev."productId" = p."id"
    WHERE ${params.whereSql}
    ORDER BY COALESCE(rev.avg_rating, 0) DESC, p."createdAt" DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `);

  return rows.map((row) => row.id);
}

/** Stable pseudo-random order for full-catalog views: same seed ⇒ same order across pages (no duplicates). */
function getDailyCatalogShuffleSeed(): string {
  return new Date().toISOString().slice(0, 10);
}

async function queryCatalogShuffledPageIds(params: {
  whereSql: Prisma.Sql;
  limit: number;
  offset: number;
  shuffleSeed: string;
}): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT p."id"
    FROM "Product" p
    WHERE ${params.whereSql}
    ORDER BY md5(p."id" || ${params.shuffleSeed}::text)
    LIMIT ${params.limit} OFFSET ${params.offset}
  `);

  return rows.map((row) => row.id);
}

/** Min/max catalog prices — cached 2 min across requests; invalidated on product updates. */
const getPublishedPriceDisplayRangeCached = cache(
  unstable_cache(
    async (): Promise<{ min: number; max: number }> => {
  const rows = await db.product.groupBy({
    by: ["currency"],
    where: {
      status: "PUBLISHED",
    },
    _min: {
      price: true,
    },
    _max: {
      price: true,
    },
  });

  if (rows.length === 0) {
    return {
      min: 0,
      max: 0,
    };
  }

  let minDisplay = Infinity;
  let maxDisplay = -Infinity;

  for (const row of rows) {
    if (row._min.price != null) {
      minDisplay = Math.min(
        minDisplay,
        storedMinorUnitsToDisplayPrice(row._min.price, row.currency),
      );
    }
    if (row._max.price != null) {
      maxDisplay = Math.max(
        maxDisplay,
        storedMinorUnitsToDisplayPrice(row._max.price, row.currency),
      );
    }
  }

      return {
        min: Number.isFinite(minDisplay) ? Math.floor(minDisplay) : 0,
        max: Number.isFinite(maxDisplay) ? Math.ceil(maxDisplay) : 0,
      };
    },
    ["catalog-price-range"],
    { tags: ["products"], revalidate: 120 },
  ),
);

const getCategoryTreeCached = cache(
  unstable_cache(
    async () =>
      db.category.findMany({
        include: {
          translations: true,
          children: {
            include: { translations: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      }),
    ["catalog-category-tree"],
    { tags: ["categories"], revalidate: 300 },
  ),
);

async function getAverageRatingsForProductIds(ids: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) {
    return new Map();
  }

  const rows = await db.review.groupBy({
    by: ["productId"],
    where: {
      productId: { in: unique },
      status: "APPROVED",
    },
    _avg: { rating: true },
  });

  return new Map(rows.map((row) => [row.productId, row._avg.rating ?? 0]));
}

async function withListProductRatings<T extends { id: string }>(
  rows: T[],
): Promise<Array<T & { reviews: Review[]; _avgRating?: number }>> {
  if (rows.length === 0) {
    return [];
  }

  const ratings = await getAverageRatingsForProductIds(rows.map((row) => row.id));

  return rows.map((row) => ({
    ...row,
    reviews: [] as Review[],
    _avgRating: ratings.get(row.id) ?? undefined,
  })) as Array<T & { reviews: Review[]; _avgRating?: number }>;
}

export const getSiteSettings = getSiteSettingsRecord;

async function fetchHomepageData(locale: AppLocale) {
  try {
    const settings = await getSiteSettings();
    const featuredProductIds = settings ? parseJson<string[]>(settings.featuredProductIds, []) : [];

    const [banners, categories, featuredRows] = await Promise.all([
      db.banner.findMany({
        where: {
          isActive: true,
        },
        include: {
          translations: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      }),
      db.category.findMany({
        include: {
          translations: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
        take: 12,
      }),
      featuredProductIds.length === 0
        ? db.product.findMany({
            where: {
              status: "PUBLISHED",
            },
            include: productListInclude,
            take: 8,
            orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
          })
        : db.product.findMany({
            where: {
              status: "PUBLISHED",
              id: {
                in: featuredProductIds,
              },
            },
            include: productListInclude,
          }),
    ]);

    const featuredCategorySlugs = settings
      ? parseJson<string[]>(settings.featuredCategorySlugs, [])
      : [];
    const heroBanners = banners.filter((banner) => banner.type === "HERO");
    const promoBanners = banners.filter((banner) => banner.type === "PROMO");
    const selectedCategories =
      featuredCategorySlugs.length > 0
        ? categories.filter((category) => featuredCategorySlugs.includes(category.slug))
        : categories.slice(0, 3);
    const orderedFeatured =
      featuredProductIds.length > 0
        ? featuredProductIds
            .map((id) => featuredRows.find((row) => row.id === id))
            .filter((row): row is NonNullable<typeof row> => Boolean(row))
        : featuredRows;
    const selectedProducts = await withListProductRatings(orderedFeatured);

    return {
      settings,
      banners,
      heroBanners,
      promoBanners,
      categories,
      featuredCategories: selectedCategories,
      featuredProducts: selectedProducts,
      locale,
    };
  } catch (error) {
    if (isPrismaRecoverableBuildTimeError(error) || isPrismaRecoverableReadError(error)) {
      return {
        settings: null,
        banners: [],
        heroBanners: [],
        promoBanners: [],
        categories: [],
        featuredCategories: [],
        featuredProducts: [],
        locale,
      };
    }
    throw error;
  }
}

/**
 * Homepage data with cross-request persistent caching.
 * Revalidates every 60 s; invalidated by admin product/settings saves.
 */
export const getHomepageData = unstable_cache(
  fetchHomepageData,
  ["homepage-data"],
  { tags: ["homepage"], revalidate: 60 },
);

const getPublishedCategoryCountsCached = cache(
  unstable_cache(
    async () =>
      db.product.groupBy({
        by: ["categoryId"],
        where: { status: "PUBLISHED" },
        _count: { categoryId: true },
      }),
    ["catalog-category-counts"],
    { tags: ["products"], revalidate: 120 },
  ),
);

export async function getCatalogData({
  locale,
  params,
}: {
  locale: AppLocale;
  params: CatalogSearchParams;
}) {
  try {
  const [categories, priceRange, publishedCategoryCounts, categoryEdges] = await Promise.all([
    getCategoryTreeCached(),
    getPublishedPriceDisplayRangeCached(),
    getPublishedCategoryCountsCached(),
    getCategoryParentEdgesCached(),
  ]);

  const selectedCategory = params.category
    ? categories.find((category) => category.slug === params.category) ?? null
    : null;
  const selectedSubcategory =
    selectedCategory && params.subcategory
      ? categories.find((category) => category.slug === params.subcategory) ?? null
      : null;
  const localizedQuery = params.q.trim();

  let effectiveSubcategory = selectedSubcategory;
  if (selectedCategory && selectedSubcategory) {
    const descendants = collectDescendantCategoryIdsFromEdges(categoryEdges, selectedCategory.id);
    if (!descendants.includes(selectedSubcategory.id)) {
      effectiveSubcategory = null;
    }
  }

  const allowedCategoryIds = effectiveSubcategory
    ? [effectiveSubcategory.id]
    : selectedCategory
      ? collectDescendantCategoryIdsFromEdges(categoryEdges, selectedCategory.id)
      : null;
  const minPriceStored =
    typeof params.minPrice === "number"
      ? displayPriceToStoredMinorUnits(params.minPrice, STOREFRONT_CURRENCY_CODE)
      : null;
  const maxPriceStored =
    typeof params.maxPrice === "number"
      ? displayPriceToStoredMinorUnits(params.maxPrice, STOREFRONT_CURRENCY_CODE)
      : null;
  const priceFilter =
    minPriceStored !== null || maxPriceStored !== null
      ? {
          ...(minPriceStored !== null ? { gte: minPriceStored } : {}),
          ...(maxPriceStored !== null ? { lte: maxPriceStored } : {}),
        }
      : undefined;
  const where = {
    status: "PUBLISHED",
    ...(allowedCategoryIds ? { categoryId: { in: allowedCategoryIds } } : {}),
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
                  name: {
                    contains: localizedQuery,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const baseCategoryCounts = Object.fromEntries(
    publishedCategoryCounts.map((item) => [item.categoryId, item._count.categoryId]),
  ) as Record<string, number>;
  const categoryCounts = Object.fromEntries(
    categories.map((category) => [
      category.slug,
      collectDescendantCategoryIdsFromEdges(categoryEdges, category.id).reduce(
        (sum, categoryId) => sum + (baseCategoryCounts[categoryId] ?? 0),
        0,
      ),
    ]),
  ) as Record<string, number>;

  const shuffleFullCatalog = allowedCategoryIds === null && params.sort === "newest";

  // Run count and product fetch in parallel — saves a sequential DB round-trip.
  // Product fetch uses unclamped params.page for skip; if page is out-of-range
  // it returns an empty array (correct: no products on that page).
  const pageForFetch = Math.max(1, params.page);

  async function fetchPageProducts() {
    if (params.sort === "rating" || shuffleFullCatalog) {
      const whereSql = buildCatalogProductWhereSql({
        allowedCategoryIds,
        availability: params.availability,
        minPriceStored,
        maxPriceStored,
        onSaleOnly: params.onSaleOnly,
        localizedQuery,
        locale,
      });
      const offset = (pageForFetch - 1) * catalogPageSize;
      const ids =
        params.sort === "rating"
          ? await queryCatalogRatingPageIds({ whereSql, limit: catalogPageSize, offset })
          : await queryCatalogShuffledPageIds({
              whereSql,
              limit: catalogPageSize,
              offset,
              shuffleSeed: getDailyCatalogShuffleSeed(),
            });
      if (ids.length === 0) return [];
      const fetched = await db.product.findMany({
        where: { id: { in: ids } },
        include: productListInclude,
      });
      const byId = new Map(fetched.map((p) => [p.id, p] as const));
      return ids.map((id) => byId.get(id)).filter((row): row is NonNullable<typeof row> => row != null);
    }
    return db.product.findMany({
      where,
      include: productListInclude,
      orderBy: buildCatalogOrderBy(params.sort),
      skip: (pageForFetch - 1) * catalogPageSize,
      take: catalogPageSize,
    });
  }

  const [totalItems, productRows] = await Promise.all([
    db.product.count({ where }),
    fetchPageProducts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalItems / catalogPageSize));
  const currentPage = Math.min(pageForFetch, totalPages);

  const products = await withListProductRatings(productRows);
  return {
    locale,
    categories,
    categoryCounts,
    products,
    selectedCategory,
    selectedSubcategory: effectiveSubcategory,
    filters: {
      ...params,
      subcategory: effectiveSubcategory ? params.subcategory : null,
      page: currentPage,
    },
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      pageSize: catalogPageSize,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    },
    priceRange,
  };
  } catch (error) {
    if (isPrismaRecoverableBuildTimeError(error)) {
      return {
        locale,
        categories: [] as CategoryTreeRecord[],
        categoryCounts: {} as Record<string, number>,
        products: [] as ProductRecord[],
        selectedCategory: null,
        selectedSubcategory: null,
        filters: {
          ...params,
          page: 1,
        },
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          pageSize: catalogPageSize,
          hasPreviousPage: false,
          hasNextPage: false,
        },
        priceRange: { min: 0, max: 0 },
      };
    }
    throw error;
  }
}

export const getProductBySlug = cache(
  unstable_cache(
    async (slug: string) => {
      try {
        return await db.product.findFirst({
          where: {
            slug,
            status: "PUBLISHED",
          },
          include: productInclude,
        });
      } catch (error) {
        if (isPrismaRecoverableBuildTimeError(error)) {
          return null;
        }
        throw error;
      }
    },
    ["product-by-slug"],
    { tags: ["products"], revalidate: 120 },
  ),
);

async function fetchRelatedProducts(categoryId: string, excludeId: string) {
  const rows = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      categoryId,
      id: { not: excludeId },
    },
    include: productListInclude,
    take: 4,
  });
  return withListProductRatings(rows);
}

export const getRelatedProducts = unstable_cache(
  fetchRelatedProducts,
  ["related-products"],
  { tags: ["products"], revalidate: 120 },
);

export async function getRecentlyViewedProducts(currentProductId: string) {
  return withPrismaFallback(async () => {
    const ids = (await getRecentlyViewedProductIds()).filter((id) => id !== currentProductId);

    if (ids.length === 0) {
      return [];
    }

    const products = await db.product.findMany({
      where: {
        status: "PUBLISHED",
        id: {
          in: ids,
        },
      },
      include: productListInclude,
    });

    const order = new Map(ids.map((id, index) => [id, index] satisfies [string, number]));

    const sorted = products
      .sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
      .slice(0, 4);

    return withListProductRatings(sorted);
  }, []);
}

async function loadWishlistItems() {
  return withPrismaFallback(async () => {
    const owner = await resolveStorefrontOwner();

    const items = (await getOwnedListItems({
      model: "wishlistItem",
      owner,
      orderBy: {
        createdAt: "desc",
      },
    })) as WishlistItemRecord[];

    if (items.length === 0) {
      return items;
    }

    const ratings = await getAverageRatingsForProductIds(items.map((item) => item.product.id));

    return items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        reviews: [] as Review[],
        _avgRating: ratings.get(item.product.id) ?? undefined,
      },
    }));
  }, []);
}

/** Dedupes with StorefrontShell + account/compare flows in one RSC request. */
export const getWishlistItems = cache(loadWishlistItems);

async function loadCompareItems() {
  return withPrismaFallback(async () => {
    const owner = await resolveStorefrontOwner();

    const items = (await getOwnedListItems({
      model: "compareItem",
      owner,
      orderBy: {
        createdAt: "asc",
      },
    })) as CompareItemRecord[];

    if (items.length === 0) {
      return items;
    }

    const ratings = await getAverageRatingsForProductIds(items.map((item) => item.product.id));

    return items.map((item) => ({
      ...item,
      product: {
        ...item.product,
        reviews: [] as Review[],
        _avgRating: ratings.get(item.product.id) ?? undefined,
      },
    }));
  }, []);
}

export const getCompareItems = cache(loadCompareItems);

async function loadCart() {
  return withPrismaFallback(async () => {
    const owner = await resolveStorefrontOwner();

    const cart = (await getOwnedCart(owner, {
      include: {
        promoCode: true,
        items: {
          include: {
            product: {
              include: productListInclude,
            },
          },
          orderBy: {
            id: "desc",
          },
        },
      },
    })) as {
      id: string;
      promoCode: PromoCode | null;
      items: CartItemRecord[];
    } | null;

    if (!cart?.items.length) {
      return cart;
    }

    const ratings = await getAverageRatingsForProductIds(cart.items.map((item) => item.product.id));

    return {
      ...cart,
      items: cart.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          reviews: [] as Review[],
          _avgRating: ratings.get(item.product.id) ?? undefined,
        },
      })),
    };
  }, null);
}

/** Dedupes cart DB work when layout + page both request the cart in one navigation. */
export const getCart = cache(loadCart);

export async function getAccountSurfaceData(locale: AppLocale) {
  try {
  const sessionId = await getSessionId();
  const viewer = await getAuthenticatedUser();
  const ownerClauses = [
    ...(viewer?.id ? [{ userId: viewer.id }] : []),
    ...(sessionId ? [{ sessionId }] : []),
  ];

  const [wishlist, compare, cart, builds, requests, orders] = await Promise.all([
    getWishlistItems(),
    getCompareItems(),
    getCart(),
    ownerClauses.length > 0
      ? db.pcBuild.findMany({
          where: {
            OR: ownerClauses,
          },
          include: {
            items: {
              include: {
                product: {
                  include: productListInclude,
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 4,
        })
      : Promise.resolve([]),
    ownerClauses.length > 0
      ? db.pcBuildRequest.findMany({
          where: {
            OR: [
              ...(viewer?.id ? [{ userId: viewer.id }] : []),
              ...(sessionId
                ? [
                    {
                      build: {
                        sessionId,
                      },
                    },
                  ]
                : []),
            ],
          },
          include: {
            build: {
              include: {
                items: {
                  include: {
                    product: {
                      include: productListInclude,
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 6,
        })
      : Promise.resolve([]),
    viewer?.id
      ? db.order.findMany({
          where: {
            userId: viewer.id,
          },
          include: {
            items: {
              orderBy: {
                id: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const accountSurfaceProductIds = [
    ...new Set([
      ...builds.flatMap((b) => b.items.map((i) => i.product.id)),
      ...requests.flatMap((r) => r.build.items.map((i) => i.product.id)),
    ]),
  ];
  const accountSurfaceRatings =
    accountSurfaceProductIds.length > 0
      ? await getAverageRatingsForProductIds(accountSurfaceProductIds)
      : new Map<string, number>();

  function enrichAccountSurfaceProduct<T extends { id: string }>(
    product: T,
  ): T & { reviews: Review[]; _avgRating?: number } {
    return {
      ...product,
      reviews: [] as Review[],
      _avgRating: accountSurfaceRatings.get(product.id) ?? undefined,
    };
  }

  const buildsWithRatings = builds.map((build) => ({
    ...build,
    items: build.items.map((item) => ({
      ...item,
      product: enrichAccountSurfaceProduct(item.product),
    })),
  }));

  const requestsWithRatings = requests.map((request) => ({
    ...request,
    build: {
      ...request.build,
      items: request.build.items.map((item) => ({
        ...item,
        product: enrichAccountSurfaceProduct(item.product),
      })),
    },
  }));

  const buildSummaries = buildsWithRatings.map((build) => ({
    id: build.id,
    name: build.name,
    slug: build.slug,
    updatedAt: build.updatedAt,
    currency: build.items[0]?.product.currency ?? STOREFRONT_CURRENCY_CODE,
    totalPrice:
      build.totalPrice > 0
        ? build.totalPrice
        : build.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    items: build.items.map((item) => ({
      id: item.id,
      slot: item.slot,
      quantity: item.quantity,
      product: mapProduct(item.product, locale),
    })),
  }));

  const buildRequestSummaries = requestsWithRatings.map((request) => {
    const snapshotItems = parseBuildRequestItemsSnapshot(request.itemsSnapshot);
    const items =
      snapshotItems.length > 0
        ? snapshotItems.map((item) => ({
            id: `${request.id}:${item.productId}:${item.slot}`,
            quantity: item.quantity,
            product: {
              id: item.productId,
              slug: item.productSlug,
              name: item.productName,
              heroImage: item.heroImage,
              price: item.price,
              currency: item.currency,
            },
          }))
        : request.build.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            product: mapProduct(item.product, locale),
          }));

    return {
      id: request.id,
      number: `LM-${request.id.slice(-6).toUpperCase()}`,
      createdAt: request.createdAt,
      status: request.status,
      currency: request.currency,
      total:
        request.totalPrice > 0
          ? request.totalPrice
          : items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      items,
    };
  });

  const storefrontOrders = orders.map((order) => ({
    id: order.id,
    number: `ORD-${order.id.slice(-6).toUpperCase()}`,
    createdAt: order.createdAt,
    status: normalizeOrderStatus(order.status),
    orderKind: getOrderKindFromItems(order.items),
    currency: order.currency,
    total: order.totalPrice,
    deliveryCity: order.deliveryCity,
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    deliveryBranch: order.deliveryBranch,
    items: order.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      configuration: item.configuration,
      product: {
        id: item.productId ?? item.id,
        slug: item.productSlug ?? "",
        name: item.productName,
        heroImage: resolveHeroImageSrc(item.heroImage),
        price: item.unitPrice,
        currency: item.currency,
      },
    })),
  }));

  return {
    locale,
    isAuthenticated: Boolean(viewer),
    viewer,
    wishlist: wishlist.map((item) => ({
      id: item.id,
      productId: item.productId,
      product: mapProduct(item.product, locale),
    })),
    compareCount: compare.length,
    cartItemsCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    cartCurrency: cart?.items[0]?.product.currency ?? STOREFRONT_CURRENCY_CODE,
    cartSubtotal:
      cart?.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) ?? 0,
    builds: buildSummaries,
    orders: storefrontOrders,
    buildRequests: buildRequestSummaries,
  };
  } catch (error) {
    if (isPrismaRecoverableBuildTimeError(error)) {
      return {
        locale,
        isAuthenticated: false,
        viewer: null,
        wishlist: [],
        compareCount: 0,
        cartItemsCount: 0,
        cartCurrency: STOREFRONT_CURRENCY_CODE,
        cartSubtotal: 0,
        builds: [],
        orders: [],
        buildRequests: [],
      };
    }
    throw error;
  }
}

export function pickByLocale<
  T extends {
    locale: string;
  },
>(items: T[], locale: string) {
  return (
    items.find((item) => item.locale === locale) ??
    items.find((item) => item.locale === defaultLocale) ??
    items[0]
  );
}

export function mapProduct(product: ProductRecord & { _avgRating?: number }, locale: AppLocale) {
  const translation = pickByLocale(product.translations, locale);
  const categoryTranslation = pickByLocale(product.category.translations, locale);
  const rating =
    typeof product._avgRating === "number"
      ? product._avgRating
      : product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;
  const heroImage = resolveHeroImageSrc(product.heroImage);

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: translation.name,
    shortDescription: translation.shortDescription,
    description: translation.description,
    seoTitle: translation.seoTitle,
    seoDescription: translation.seoDescription,
    heroImage,
    gallery: parseJson<string[]>(product.gallery, [heroImage]),
    price: product.price,
    purchasePrice: product.purchasePrice,
    oldPrice: product.oldPrice,
    stock: product.stock,
    currency: product.currency,
    inventoryStatus: product.inventoryStatus,
    inventoryLabel:
      inventoryLabels[product.inventoryStatus as keyof typeof inventoryLabels] ??
      product.inventoryStatus,
    category: {
      name: categoryTranslation.name,
      slug: product.category.slug,
    },
    reviews: product.reviews,
    rating,
    specs: parseJson<Record<string, string | number | boolean>>(product.specs, {}),
    metadata: parseJson<Record<string, string | number | boolean>>(product.metadata, {}),
    technicalAttributes: getNormalizedTechnicalAttributeMap(product),
  };
}
