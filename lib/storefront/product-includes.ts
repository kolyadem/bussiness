/**
 * Shared Prisma include shapes for products. List views omit reviews and use
 * a single aggregated query for average ratings (see storefront/queries).
 */
export const productListInclude = {
  translations: true,
  attributes: {
    include: {
      attribute: true,
    },
  },
  brand: {
    include: {
      translations: true,
    },
  },
  category: {
    include: {
      translations: true,
    },
  },
} as const;

export const productInclude = {
  ...productListInclude,
  reviews: {
    where: {
      status: "APPROVED",
    },
    orderBy: {
      createdAt: "desc" as const,
    },
  },
} as const;
