import { z } from "zod";
import {
  displayPriceToStoredMinorUnits,
  parseJson,
  slugify,
  STOREFRONT_CURRENCY_CODE,
} from "@/lib/utils";
import { locales } from "@/lib/constants";

export const inventoryStatuses = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"] as const;
export const productStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const localizedProductSchema = z.object({
  locale: z.enum(locales),
  name: z.string().trim().min(2).max(160),
  shortDescription: z.string().trim().min(2).max(240),
  description: z.string().trim().min(2),
  seoTitle: z.string().trim().max(160).optional(),
  seoDescription: z.string().trim().max(220).optional(),
});

export const productBaseSchema = z.object({
  locale: z.enum(locales),
  externalId: z.string().trim().min(1).max(191).nullable().optional(),
  importSourceKey: z.string().trim().min(1).max(120).nullable().optional(),
  slug: z.string().trim().min(2).max(180),
  sku: z.string().trim().min(2).max(64),
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1),
  status: z.enum(productStatuses),
  price: z.coerce.number().finite().nonnegative(),
  purchasePrice: z.coerce.number().finite().nonnegative().nullable().optional(),
  oldPrice: z.coerce.number().finite().nonnegative().nullable(),
  currency: z.string().trim().min(3).max(3),
  inventoryStatus: z.enum(inventoryStatuses),
  stock: z.coerce.number().int().nonnegative(),
});

export function normalizeProductBaseInput(input: {
  locale: string;
  externalId?: string | null;
  importSourceKey?: string | null;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  status: string;
  price: string | number;
  purchasePrice?: string | number | null;
  oldPrice: string | number | null;
  currency: string;
  inventoryStatus: string;
  stock: string | number;
}) {
  return productBaseSchema.safeParse({
    locale: input.locale,
    externalId: input.externalId ?? null,
    importSourceKey: input.importSourceKey ?? null,
    slug: slugify(input.slug),
    sku: String(input.sku).trim().toUpperCase(),
    categoryId: input.categoryId,
    brandId: input.brandId,
    status: input.status,
    price: input.price,
    purchasePrice: input.purchasePrice ?? null,
    oldPrice: input.oldPrice,
    currency: String(input.currency).trim().toUpperCase(),
    inventoryStatus: input.inventoryStatus,
    stock: input.stock,
  });
}

export function normalizeLocalizedProductInput(
  translations: Array<{
    locale: string;
    name: string;
    shortDescription: string;
    description: string;
    seoTitle?: string;
    seoDescription?: string;
  }>,
) {
  const parsed = z.array(localizedProductSchema).safeParse(translations);

  if (!parsed.success) {
    return parsed;
  }

  return {
    success: true as const,
    data: parsed.data.map((item) => ({
      ...item,
      seoTitle: item.seoTitle || null,
      seoDescription: item.seoDescription || null,
    })),
  };
}

export function buildProductPersistenceInput(input: {
  base: {
    externalId?: string | null;
    importSourceKey?: string | null;
    slug: string;
    sku: string;
    categoryId: string;
    brandId: string;
    status: (typeof productStatuses)[number];
    price: number;
    purchasePrice: number | null;
    oldPrice: number | null;
    currency: string;
    inventoryStatus: (typeof inventoryStatuses)[number];
    stock: number;
  };
  assets: {
    heroImage: string;
    gallery: string;
  };
  content: {
    specs: string;
    metadata: string;
    technicalAttributes: Record<string, string>;
    translations: Array<{
      locale: string;
      name: string;
      shortDescription: string;
      description: string;
      seoTitle: string | null;
      seoDescription: string | null;
    }>;
  };
}) {
  return {
    externalId: input.base.externalId ?? null,
    importSourceKey: input.base.importSourceKey ?? null,
    slug: input.base.slug,
    sku: input.base.sku,
    categoryId: input.base.categoryId,
    brandId: input.base.brandId,
    status: input.base.status,
    price: input.base.price,
    purchasePrice: input.base.purchasePrice,
    oldPrice: input.base.oldPrice,
    currency: input.base.currency,
    inventoryStatus: input.base.inventoryStatus,
    stock: input.base.stock,
    heroImage: input.assets.heroImage,
    gallery: input.assets.gallery,
    specs: input.content.specs,
    metadata: input.content.metadata,
    technicalAttributes: input.content.technicalAttributes,
    translations: input.content.translations,
  };
}

export const ingestSpecValueSchema = z.union([z.string(), z.number(), z.boolean()]);

/** Nested object allowed under metadata.priceMatch (catalog part numbers for price-preview matching). */
export const priceMatchMetadataSchema = z
  .object({
    primaryMpn: z.string().trim().min(1).optional(),
    mpns: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

export const metadataValueSchema = z.union([ingestSpecValueSchema, priceMatchMetadataSchema]);

export const ingestTranslationInputSchema = z.object({
  locale: z.enum(locales),
  name: z.string().trim().min(2).max(160),
  shortDescription: z.string().trim().min(2).max(240),
  description: z.string().trim().min(2),
  seoTitle: z.string().trim().max(160).nullish(),
  seoDescription: z.string().trim().max(220).nullish(),
});

export const productIngestPayloadSchema = z.object({
  locale: z.enum(locales).default("uk"),
  externalId: z.string().trim().min(1).max(191).nullish(),
  importSourceKey: z.string().trim().min(1).max(120).nullish(),
  slug: z.string().trim().min(2).max(180),
  sku: z.string().trim().min(2).max(64),
  categoryId: z.string().trim().min(1),
  brandId: z.string().trim().min(1),
  status: z.enum(productStatuses),
  price: z.coerce.number().finite().nonnegative(),
  purchasePrice: z.coerce.number().finite().nonnegative().nullish(),
  oldPrice: z.coerce.number().finite().nonnegative().nullable().optional(),
  currency: z.string().trim().min(3).max(3).default(STOREFRONT_CURRENCY_CODE),
  inventoryStatus: z.enum(inventoryStatuses),
  stock: z.coerce.number().int().nonnegative(),
  heroImage: z.string().trim().min(1),
  gallery: z.array(z.string().trim().min(1)).default([]),
  specs: z.record(z.string().trim().min(1), ingestSpecValueSchema).default({}),
  metadata: z.record(z.string().trim().min(1), metadataValueSchema).default({}),
  technicalAttributes: z.record(z.string().trim().min(1), z.string().trim().min(1)).default({}),
  translations: z.array(ingestTranslationInputSchema).length(1),
});

export type ProductIngestPayload = z.infer<typeof productIngestPayloadSchema>;
export type NormalizedProductPersistenceData = {
  locale: (typeof locales)[number];
  externalId: string | null;
  importSourceKey: string | null;
  slug: string;
  sku: string;
  categoryId: string;
  brandId: string;
  status: (typeof productStatuses)[number];
  price: number;
  purchasePrice: number | null;
  oldPrice: number | null;
  currency: string;
  inventoryStatus: (typeof inventoryStatuses)[number];
  stock: number;
  heroImage: string;
  gallery: string;
  specs: string;
  metadata: string;
  technicalAttributes: Record<string, string>;
  translations: Array<{
    locale: string;
    name: string;
    shortDescription: string;
    description: string;
    seoTitle: string | null;
    seoDescription: string | null;
  }>;
};

export function normalizeProductIngestPayload(input: unknown) {
  const parsed = productIngestPayloadSchema.safeParse(input);

  if (!parsed.success) {
    return parsed;
  }

  const translationResult = normalizeLocalizedProductInput(
    parsed.data.translations.map((item) => ({
      ...item,
      seoTitle: item.seoTitle ?? undefined,
      seoDescription: item.seoDescription ?? undefined,
    })),
  );
  const baseResult = normalizeProductBaseInput({
    locale: parsed.data.locale,
    externalId: parsed.data.externalId ?? null,
    importSourceKey: parsed.data.importSourceKey ?? null,
    slug: parsed.data.slug,
    sku: parsed.data.sku,
    categoryId: parsed.data.categoryId,
    brandId: parsed.data.brandId,
    status: parsed.data.status,
    price: parsed.data.price,
    purchasePrice: parsed.data.purchasePrice ?? null,
    oldPrice: parsed.data.oldPrice ?? null,
    currency: parsed.data.currency,
    inventoryStatus: parsed.data.inventoryStatus,
    stock: parsed.data.stock,
  });

  if (!translationResult.success || !baseResult.success) {
    return {
      success: false as const,
      error: {
        issues: [
          ...(!translationResult.success ? translationResult.error.issues : []),
          ...(!baseResult.success ? baseResult.error.issues : []),
        ],
      },
    };
  }

  const heroImage = parsed.data.heroImage.trim();
  const gallery = parsed.data.gallery.filter(Boolean);
  const normalizedGallery = gallery.length > 0 ? gallery : [heroImage];

  return {
    success: true as const,
    data: {
      locale: baseResult.data.locale,
      ...buildProductPersistenceInput({
        base: {
          ...baseResult.data,
          price: displayPriceToStoredMinorUnits(
            baseResult.data.price,
            baseResult.data.currency,
          ),
          purchasePrice:
            typeof baseResult.data.purchasePrice === "number"
              ? displayPriceToStoredMinorUnits(
                  baseResult.data.purchasePrice,
                  baseResult.data.currency,
                )
              : null,
          oldPrice:
            typeof baseResult.data.oldPrice === "number"
              ? displayPriceToStoredMinorUnits(
                  baseResult.data.oldPrice,
                  baseResult.data.currency,
                )
              : null,
        },
        assets: {
          heroImage,
          gallery: JSON.stringify(normalizedGallery),
        },
        content: {
          specs: JSON.stringify(parsed.data.specs),
          metadata: JSON.stringify(parsed.data.metadata),
          technicalAttributes: parsed.data.technicalAttributes,
          translations: translationResult.data,
        },
      }),
    },
  };
}

export function parseExistingGallery(value: string) {
  return parseJson<string[]>(value, []);
}
