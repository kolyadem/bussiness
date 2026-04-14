import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { AppLocale } from "@/lib/constants";
import { isPrismaRecoverableBuildTimeError } from "@/lib/prisma-build";
import { calculateUnitFinancials } from "@/lib/commerce/finance";
import { mapProduct } from "@/lib/storefront/queries";
import { productListInclude } from "@/lib/storefront/product-includes";
import type { ProductRecord } from "@/lib/storefront/types";
import type { Review } from "@prisma/client";

export type SmartBadge = "POPULAR" | "VALUE" | "BEST_CHOICE";

type DecoratedProduct = ReturnType<typeof mapProduct> & {
  conversionBadge: SmartBadge | null;
  salesCount: number;
};

type RecommendationCollections = {
  similar: DecoratedProduct[];
  betterVariant: DecoratedProduct | null;
  valueChoice: DecoratedProduct | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSharedAttributeScore(left: ProductRecord, right: ProductRecord) {
  let score = 0;
  const keys = ["socket", "memoryType", "formFactor", "storageInterface"];

  for (const key of keys) {
    const leftValue = String(left[key as keyof ProductRecord] ?? "").trim().toLowerCase();
    const rightValue = String(right[key as keyof ProductRecord] ?? "").trim().toLowerCase();

    if (leftValue && rightValue && leftValue === rightValue) {
      score += 1;
    }
  }

  const leftAttributes = new Map(
    left.attributes.map((attribute) => [attribute.attribute.code, attribute.value]),
  );

  for (const attribute of right.attributes) {
    if (leftAttributes.get(attribute.attribute.code) === attribute.value) {
      score += 0.5;
    }
  }

  return score;
}

async function getSalesMapForProducts(productIds: string[]) {
  const items = await db.orderItem.findMany({
    where: {
      productId: {
        in: productIds,
      },
    },
    select: {
      productId: true,
    },
  });

  const counts = new Map<string, number>();

  for (const item of items) {
    if (!item.productId) {
      continue;
    }

    counts.set(item.productId, (counts.get(item.productId) ?? 0) + 1);
  }

  return counts;
}

function resolveExplicitBadge(input: {
  salesCount: number;
  price: number;
  oldPrice: number | null;
  purchasePrice: number | null;
  rating: number;
}): SmartBadge | null {
  const financials = calculateUnitFinancials({
    price: input.price,
    purchasePrice: input.purchasePrice,
  });

  if (input.salesCount >= 3 || input.rating >= 4.7) {
    return "POPULAR";
  }

  if (
    financials.marginPercent !== null &&
    financials.marginPercent >= 30 &&
    (input.oldPrice !== null || input.price <= 80000)
  ) {
    return "BEST_CHOICE";
  }

  if (input.oldPrice !== null || (financials.marginPercent !== null && financials.marginPercent >= 18)) {
    return "VALUE";
  }

  return null;
}

async function addAvgRatings<T extends { id: string }>(
  rows: T[],
): Promise<Array<T & { reviews: Review[]; _avgRating?: number }>> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const ratingsRows = await db.review.groupBy({
    by: ["productId"],
    where: { productId: { in: ids }, status: "APPROVED" },
    _avg: { rating: true },
  });
  const avgMap = new Map(ratingsRows.map((r) => [r.productId, r._avg.rating ?? 0]));
  return rows.map((r) => ({ ...r, reviews: [] as Review[], _avgRating: avgMap.get(r.id) }));
}

function decorateProducts(
  locale: AppLocale,
  products: Array<ProductRecord & { _avgRating?: number }>,
  salesMap: Map<string, number>,
): DecoratedProduct[] {
  return products.map((product) => {
    const mapped = mapProduct(product, locale);
    const salesCount = salesMap.get(product.id) ?? 0;

    return {
      ...mapped,
      salesCount,
      conversionBadge: resolveExplicitBadge({
        salesCount,
        price: mapped.price,
        oldPrice: mapped.oldPrice,
        purchasePrice: mapped.purchasePrice ?? null,
        rating: mapped.rating,
      }),
    };
  });
}

function getSimilarityScore(current: ProductRecord, candidate: ProductRecord) {
  const priceGap = Math.abs(candidate.price - current.price) / Math.max(current.price, 1);
  return (
    (candidate.categoryId === current.categoryId ? 3 : 0) +
    (candidate.brandId === current.brandId ? 1.5 : 0) +
    getSharedAttributeScore(current, candidate) -
    priceGap * 2
  );
}

function getBetterVariantScore(current: ProductRecord, candidate: ProductRecord, salesCount: number) {
  const priceRatio = candidate.price / Math.max(current.price, 1);
  const financials = calculateUnitFinancials({
    price: candidate.price,
    purchasePrice: candidate.purchasePrice,
  });

  return (
    getSimilarityScore(current, candidate) * 1.3 +
    clamp(1.3 - Math.abs(priceRatio - 1.18), 0, 1.3) * 3 +
    (financials.marginPercent ?? 0) / 10 +
    salesCount * 0.25
  );
}

function getValueChoiceScore(
  current: ProductRecord,
  candidate: ProductRecord & { _avgRating?: number },
  salesCount: number,
) {
  const priceAdvantage = (current.price - candidate.price) / Math.max(current.price, 1);
  const financials = calculateUnitFinancials({
    price: candidate.price,
    purchasePrice: candidate.purchasePrice,
  });

  return (
    getSimilarityScore(current, candidate) +
    clamp(priceAdvantage, -0.15, 0.35) * 4 +
    (financials.marginPercent ?? 0) / 12 +
    salesCount * 0.2 +
    (candidate._avgRating ?? 0) * 0.05
  );
}

async function fetchProductRecommendationCollections(
  productId: string,
  categoryId: string,
  brandId: string,
  price: number,
  locale: AppLocale,
  currentProductRef: ProductRecord,
): Promise<RecommendationCollections> {
  try {
  const rawCandidates = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: productId },
      OR: [{ categoryId }, { brandId }],
    },
    include: productListInclude,
    take: 18,
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
  });

  if (rawCandidates.length === 0) {
    return { similar: [], betterVariant: null, valueChoice: null };
  }

  const [candidates, salesMap] = await Promise.all([
    addAvgRatings(rawCandidates),
    getSalesMapForProducts(rawCandidates.map((c) => c.id)),
  ]);

  const decorated = decorateProducts(locale, candidates, salesMap);
  const decoratedMap = new Map(decorated.map((item) => [item.id, item] as const));
  const product = currentProductRef;

  const betterVariantRecord =
    [...candidates]
      .filter(
        (candidate) =>
          candidate.categoryId === categoryId &&
          candidate.price > price &&
          candidate.price <= price * 1.45,
      )
      .sort(
        (left, right) =>
          getBetterVariantScore(product, right, salesMap.get(right.id) ?? 0) -
          getBetterVariantScore(product, left, salesMap.get(left.id) ?? 0),
      )[0] ?? null;

  const valueChoiceRecord =
    [...candidates]
      .filter(
        (candidate) =>
          candidate.categoryId === categoryId &&
          candidate.price <= price * 1.08 &&
          candidate.price >= price * 0.72,
      )
      .sort(
        (left, right) =>
          getValueChoiceScore(product, right, salesMap.get(right.id) ?? 0) -
          getValueChoiceScore(product, left, salesMap.get(left.id) ?? 0),
      )[0] ?? null;

  const excludedIds = new Set(
    [betterVariantRecord?.id, valueChoiceRecord?.id].filter(Boolean) as string[],
  );
  const similar = [...candidates]
    .filter((candidate) => !excludedIds.has(candidate.id))
    .sort((left, right) => getSimilarityScore(product, right) - getSimilarityScore(product, left))
    .slice(0, 4)
    .map((candidate) => decoratedMap.get(candidate.id)!)
    .filter(Boolean);

  return {
    similar,
    betterVariant: betterVariantRecord ? decoratedMap.get(betterVariantRecord.id) ?? null : null,
    valueChoice: valueChoiceRecord ? decoratedMap.get(valueChoiceRecord.id) ?? null : null,
  };
  } catch (error) {
    if (isPrismaRecoverableBuildTimeError(error)) {
      return {
        similar: [],
        betterVariant: null,
        valueChoice: null,
      };
    }
    throw error;
  }
}

/**
 * Fetch recommendation collections for a product page.
 * Results cached per product+locale for 2 minutes; invalidated on product updates.
 * Uses productListInclude (no heavy review content) + aggregated rating query.
 */
export async function getProductRecommendationCollections(
  product: ProductRecord,
  locale: AppLocale,
): Promise<RecommendationCollections> {
  const cached = unstable_cache(
    (productId: string, categoryId: string, brandId: string, price: number, loc: AppLocale) =>
      fetchProductRecommendationCollections(productId, categoryId, brandId, price, loc, product),
    ["product-recs"],
    { tags: ["products"], revalidate: 120 },
  );
  return cached(product.id, product.categoryId, product.brandId, product.price, locale);
}

const CATEGORY_COMPLEMENTS: Record<string, string[]> = {
  processors: ["cooling", "motherboards", "memory"],
  motherboards: ["memory", "storage", "cooling"],
  memory: ["storage", "motherboards"],
  "graphics-cards": ["power-supplies", "monitors", "cases"],
  storage: ["memory", "motherboards"],
  "power-supplies": ["cases", "graphics-cards"],
  coolers: ["processors", "cases"],
  cooling: ["processors", "cases"],
  cases: ["power-supplies", "cooling"],
  monitors: ["peripherals"],
};

function getCartUpsellScore(
  candidate: ProductRecord,
  context: {
    averagePrice: number;
    categoryIds: Set<string>;
    brandIds: Set<string>;
    complementSlugs: Set<string>;
    salesCount: number;
  },
) {
  const financials = calculateUnitFinancials({
    price: candidate.price,
    purchasePrice: candidate.purchasePrice,
  });
  const priceRatio = candidate.price / Math.max(context.averagePrice, 1);

  return (
    (context.categoryIds.has(candidate.categoryId) ? 2.5 : 0) +
    (context.brandIds.has(candidate.brandId) ? 1 : 0) +
    (context.complementSlugs.has(candidate.category.slug) ? 1.8 : 0) +
    clamp(1.1 - Math.abs(priceRatio - 0.55), 0, 1.1) * 2 +
    (financials.marginPercent ?? 0) / 12 +
    context.salesCount * 0.2 +
    (candidate.oldPrice ? 0.6 : 0)
  );
}

export async function getCartUpsellProducts(
  locale: AppLocale,
  cart: {
    items: Array<{
      productId: string;
      product: ProductRecord;
    }>;
  } | null,
) {
  if (!cart || cart.items.length === 0) {
    return [];
  }

  const currentProducts = cart.items.map((item) => item.product);
  const currentIds = new Set(currentProducts.map((product) => product.id));
  const categoryIds = new Set(currentProducts.map((product) => product.categoryId));
  const brandIds = new Set(currentProducts.map((product) => product.brandId));
  const complementSlugs = new Set(
    currentProducts.flatMap((product) => CATEGORY_COMPLEMENTS[product.category.slug] ?? []),
  );
  const averagePrice =
    currentProducts.reduce((sum, product) => sum + product.price, 0) / currentProducts.length;
  const candidateWhere = [
    { categoryId: { in: Array.from(categoryIds) } },
    { brandId: { in: Array.from(brandIds) } },
    ...(complementSlugs.size > 0
      ? [{ category: { slug: { in: Array.from(complementSlugs) } } }]
      : []),
  ];

  const rawCandidates = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      id: {
        notIn: Array.from(currentIds),
      },
      OR: candidateWhere,
    },
    include: productListInclude,
    take: 24,
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
  });

  if (rawCandidates.length === 0) {
    return [];
  }

  const [candidates, salesMap] = await Promise.all([
    addAvgRatings(rawCandidates),
    getSalesMapForProducts(rawCandidates.map((c) => c.id)),
  ]);
  const candidateRecordMap = new Map(candidates.map((candidate) => [candidate.id, candidate] as const));

  return decorateProducts(locale, candidates, salesMap)
    .sort((left, right) => {
      const leftRecord = candidateRecordMap.get(left.id)!;
      const rightRecord = candidateRecordMap.get(right.id)!;

      return (
        getCartUpsellScore(rightRecord, {
          averagePrice,
          categoryIds,
          brandIds,
          complementSlugs,
          salesCount: salesMap.get(right.id) ?? 0,
        }) -
        getCartUpsellScore(leftRecord, {
          averagePrice,
          categoryIds,
          brandIds,
          complementSlugs,
          salesCount: salesMap.get(left.id) ?? 0,
        })
      );
    })
    .slice(0, 4);
}
