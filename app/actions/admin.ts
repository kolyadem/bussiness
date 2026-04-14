"use server";

import bcrypt from "bcryptjs";
import { Prisma, PromoCodeType } from "@prisma/client";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { SITE_MODES } from "@/lib/site-mode";
import {
  canViewAdminFinancials,
  requireAdminAccess,
  requireAdminAccess as requireAdminSession,
  requireAdminOnlyAccess,
} from "@/lib/admin";
import {
  type NormalizedProductPersistenceData,
  normalizeLocalizedProductInput,
  normalizeProductIngestPayload,
} from "@/lib/admin/product-ingest";
import {
  createProductRecord,
  isUniqueConstraintError,
  updateProductRecord,
  validateProductRelationTargets,
} from "@/lib/admin/product-persistence";
import { safeDeleteUploadedProductAsset } from "@/lib/admin/product-assets";
import { requireAuthenticatedUser } from "@/lib/auth";
import {
  getAllTechnicalAttributeDefinitions,
  getTechnicalAttributeLabel,
  normalizeTechnicalAttributeInput,
} from "@/lib/configurator/technical-attributes";
import { defaultLocale, locales, type AppLocale } from "@/lib/constants";
import { getDefaultBrandId } from "@/lib/commerce/default-brand";
import { db } from "@/lib/db";
import { normalizePromoCodeKey } from "@/lib/storefront/promo-codes";
import { parseJson, slugify, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

type ProductFormState = {
  status: "idle" | "error";
  message?: string;
};

type AccountFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

type EntityFormState = {
  status: "idle" | "error";
  message?: string;
};

type SiteSettingsFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

const PUBLIC_DIR = path.join(process.cwd(), "public");
const PRODUCT_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "products");
const SITE_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "site");
const BANNER_UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads", "banners");

function adminText(_locale: AppLocale, copy: { uk: string }) {
  return copy.uk;
}

function isFile(input: FormDataEntryValue | null): input is File {
  return input instanceof File && input.size > 0;
}

function normalizeOptionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseMetadataPayload(value: string) {
  if (!value) {
    return {
      success: true as const,
      data: {},
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        success: false as const,
      };
    }

    return {
      success: true as const,
      data: parsed as Record<string, unknown>,
    };
  } catch {
    return {
      success: false as const,
    };
  }
}

function buildProductConflictMessage(locale: AppLocale, error: unknown) {
  if (!isUniqueConstraintError(error)) {
    return adminText(locale, {
      uk: "Не вдалося зберегти товар.",
    });
  }

  const uniqueError = error as Prisma.PrismaClientKnownRequestError;
  const target = Array.isArray(uniqueError.meta?.target)
    ? uniqueError.meta.target.map((value) => String(value))
    : [];

  if (target.includes("slug")) {
    return adminText(locale, {
      uk: "Такий адрес сторінки вже використовується. Вкажіть інший slug.",
    });
  }

  if (target.includes("sku")) {
    return adminText(locale, {
      uk: "Такий SKU уже існує. Вкажіть інший артикул.",
    });
  }

  return adminText(locale, {
    uk: "Slug і SKU мають бути унікальними.",
  });
}

const localizedCategorySchema = z.object({
  locale: z.enum(locales),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
});

const localizedBannerSchema = z.object({
  locale: z.enum(locales),
  title: z.string().trim().min(2).max(180),
  subtitle: z.string().trim().max(300).optional(),
  ctaLabel: z.string().trim().max(80).optional(),
});

const categoryBaseSchema = z.object({
  locale: z.enum(locales),
  slug: z.string().trim().min(2).max(120),
  parentId: z.string().trim().nullable(),
  image: z.string().trim().nullable(),
  sortOrder: z.coerce.number().int().min(0),
});

const bannerBaseSchema = z.object({
  locale: z.enum(locales),
  key: z.string().trim().min(2).max(120),
  type: z.string().trim().min(2).max(40),
  href: z.string().trim().nullable(),
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0),
});

/** Empty string allowed; persisted as "" without DB migration. */
const optionalSupportEmail = z.union([z.literal(""), z.string().trim().email()]);
const optionalSupportPhone = z.union([z.literal(""), z.string().trim().min(5).max(40)]);
const optionalAddress = z.union([z.literal(""), z.string().trim().min(2).max(200)]);

/** Whitespace-only social URLs become null (no model change). */
const optionalSocialUrl = z
  .union([z.null(), z.string()])
  .transform((value) => {
    if (value == null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const siteSettingsSchema = z.object({
  siteMode: z.enum([SITE_MODES.store, SITE_MODES.pcBuild]),
  assemblyBaseFeeUah: z.coerce.number().int().min(0).max(50_000_000),
  assemblyPercent: z.coerce.number().int().min(0).max(100),
  brandName: z.string().trim().min(2).max(120),
  shortBrandName: z.string().trim().max(40).nullable(),
  logoText: z.string().trim().max(40).nullable(),
  supportEmail: optionalSupportEmail,
  supportPhone: optionalSupportPhone,
  address: optionalAddress,
  facebookUrl: optionalSocialUrl,
  instagramUrl: optionalSocialUrl,
  telegramUrl: optionalSocialUrl,
  youtubeUrl: optionalSocialUrl,
  metaTitle: z.string().trim().max(180).nullable(),
  metaDescription: z.string().trim().max(300).nullable(),
  defaultCurrency: z.string().trim().min(3).max(3),
  defaultLocale: z.enum(locales),
  watermarkText: z.string().trim().min(1).max(40),
  heroTitle: z.string().trim().min(2).max(180),
  heroSubtitle: z.string().trim().min(2).max(400),
  heroCtaLabel: z.string().trim().min(1).max(80),
  heroCtaHref: z.string().trim().min(1).max(180),
});

function buildLocalizedCategoryTranslations(formData: FormData) {
  const name = String(formData.get(`name:${defaultLocale}`) ?? "").trim();
  const description = String(formData.get(`description:${defaultLocale}`) ?? "").trim();
  const translations = [{ locale: defaultLocale, name, description }];
  const parsed = z.array(localizedCategorySchema).safeParse(translations);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.map((item) => ({
    ...item,
    description: item.description || null,
  }));
}

function resolveCategorySlug(formData: FormData, translations: NonNullable<ReturnType<typeof buildLocalizedCategoryTranslations>>) {
  const raw = String(formData.get("slug") ?? "").trim();
  if (raw.length > 0) {
    return slugify(raw);
  }
  const uk = translations.find((t) => t.locale === defaultLocale)?.name?.trim() ?? "";
  const any = translations.find((t) => t.name.trim().length >= 2)?.name.trim() ?? "";
  return slugify(uk || any);
}

function buildLocalizedBannerTranslations(formData: FormData) {
  const translations = [
    {
      locale: defaultLocale,
      title: String(formData.get(`title:${defaultLocale}`) ?? "").trim(),
      subtitle: String(formData.get(`subtitle:${defaultLocale}`) ?? "").trim(),
      ctaLabel: String(formData.get(`ctaLabel:${defaultLocale}`) ?? "").trim(),
    },
  ];
  const parsed = z.array(localizedBannerSchema).safeParse(translations);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.map((item) => ({
    ...item,
    subtitle: item.subtitle || null,
    ctaLabel: item.ctaLabel || null,
  }));
}

async function wouldCreateCategoryCycle(categoryId: string, nextParentId: string | null) {
  if (!nextParentId) {
    return false;
  }

  const categories = await db.category.findMany({
    select: {
      id: true,
      parentId: true,
    },
  });

  const descendants = new Set<string>();
  const queue = [categoryId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = categories.filter((item) => item.parentId === currentId);

    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return descendants.has(nextParentId);
}

function buildLocalizedTranslations(formData: FormData) {
  const name = String(formData.get(`name:${defaultLocale}`) ?? "").trim();
  let shortDescription = String(formData.get(`shortDescription:${defaultLocale}`) ?? "").trim();
  let description = String(formData.get(`description:${defaultLocale}`) ?? "").trim();
  const seoTitle = String(formData.get(`seoTitle:${defaultLocale}`) ?? "").trim();
  const seoDescription = String(formData.get(`seoDescription:${defaultLocale}`) ?? "").trim();

  if (shortDescription.length < 2) {
    shortDescription = (name.slice(0, 240) || "—").slice(0, 240);
    if (shortDescription.length < 2) {
      shortDescription = "—".repeat(2);
    }
  }

  if (description.length < 2) {
    description = shortDescription.length >= 2 ? shortDescription : name;
    if (description.length < 2) {
      description = `${name || "Товар"}. Детальний опис можна додати пізніше.`;
    }
  }

  const translations = [
    {
      locale: defaultLocale,
      name,
      shortDescription,
      description,
      seoTitle,
      seoDescription,
    },
  ];

  const parsed = normalizeLocalizedProductInput(translations);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

function buildSpecsPayload(formData: FormData) {
  const keys = formData
    .getAll("specKey")
    .map((entry) => String(entry ?? "").trim());
  const values = formData
    .getAll("specValue")
    .map((entry) => String(entry ?? "").trim());

  const specs = keys.reduce<Record<string, string>>((acc, key, index) => {
    const value = values[index] ?? "";

    if (key && value) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return specs;
}

function buildTechnicalAttributesPayload(
  formData: FormData,
  locale: AppLocale,
):
  | {
      error: string;
    }
  | {
      data: Record<string, string>;
    } {
  const technicalAttributes: Record<string, string> = {};

  for (const definition of getAllTechnicalAttributeDefinitions()) {
    const result = normalizeTechnicalAttributeInput(
      definition,
      String(formData.get(`technical:${definition.code}`) ?? ""),
    );

    if (!result.success) {
      return {
        error: adminText(locale, {
          uk: `Поле "${getTechnicalAttributeLabel(definition, locale)}" містить некоректне значення.`,
        }),
      } as const;
    }

    if (result.value) {
      technicalAttributes[definition.code] = result.value;
    }
  }

  return {
    data: technicalAttributes,
  } as const;
}

async function ensureUploadDir(targetDir: string) {
  await mkdir(targetDir, { recursive: true });
}

async function saveUploadedAsset(file: File, targetDir: string, publicPrefix: string) {
  await ensureUploadDir(targetDir);

  const extension = path.extname(file.name || "").toLowerCase() || ".bin";
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(targetDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(absolutePath, buffer);

  return `${publicPrefix}/${filename}`;
}

function resolveManagedAssetPath(assetPath: string) {
  const normalized = assetPath.replace(/^\/+/, "");
  const absolute = path.resolve(PUBLIC_DIR, normalized);
  const allowedRoots = [
    path.resolve(PRODUCT_UPLOAD_DIR),
    path.resolve(SITE_UPLOAD_DIR),
    path.resolve(BANNER_UPLOAD_DIR),
  ];

  if (!allowedRoots.some((root) => absolute.startsWith(root))) {
    return null;
  }

  return absolute;
}

async function safeDeleteManagedAsset(assetPath: string | null | undefined) {
  if (!assetPath || !assetPath.startsWith("/uploads/")) {
    return;
  }

  const absolutePath = resolveManagedAssetPath(assetPath);

  if (!absolutePath) {
    return;
  }

  try {
    await unlink(absolutePath);
  } catch {
    // Ignore missing files.
  }
}

function getSlugSourceFromTranslations(
  locale: AppLocale,
  translations: Array<{
    locale: string;
    name: string;
  }>,
) {
  const priority = [locale, defaultLocale];

  for (const targetLocale of priority) {
    const match = translations.find(
      (translation) => translation.locale === targetLocale && translation.name.trim().length > 0,
    );

    if (match) {
      return match.name;
    }
  }

  return translations.find((translation) => translation.name.trim().length > 0)?.name ?? "";
}

async function buildProductPayload(
  formData: FormData,
  locale: AppLocale,
  existingProductId?: string,
  canManageFinancials = true,
): Promise<
  | {
      error: string;
    }
  | {
      data: NormalizedProductPersistenceData;
    }
> {
  const localizedTranslations = buildLocalizedTranslations(formData);

  if (!localizedTranslations) {
    return {
      error: adminText(locale, {
        uk: "Заповніть обов'язкові локалізовані поля товару (назва, короткий опис тощо).",
      }),
    } as const;
  }

  const metadataValue = String(formData.get("metadata") ?? "").trim();
  const nextGallery = formData
    .getAll("galleryAsset")
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  let heroImage = String(formData.get("heroImagePath") ?? "").trim();

  if (!heroImage) {
    heroImage = nextGallery[0] ?? "";
  }

  if (!heroImage) {
    return {
      error: adminText(locale, {
        uk: "Додайте хоча б одне фото (у галерею або окремо як головне).",
      }),
    } as const;
  }

  const metadataResult = parseMetadataPayload(metadataValue);

  if (!metadataResult.success) {
    return {
      error: adminText(locale, {
        uk: "Поле metadata повинно містити коректний JSON-об'єкт.",
      }),
    } as const;
  }

  const ptRozetka = String(formData.get("priceTrackingRozetkaUrl") ?? "").trim();
  const ptTelemart = String(formData.get("priceTrackingTelemartUrl") ?? "").trim();
  if (ptRozetka || ptTelemart) {
    const existing =
      metadataResult.data.priceTracking && typeof metadataResult.data.priceTracking === "object"
        ? (metadataResult.data.priceTracking as Record<string, unknown>)
        : {};
    metadataResult.data.priceTracking = {
      ...existing,
      ...(ptRozetka ? { rozetkaUrl: ptRozetka } : {}),
      ...(ptTelemart ? { telemartUrl: ptTelemart } : {}),
    };
  }

  const specs = buildSpecsPayload(formData);
  const technicalAttributes = buildTechnicalAttributesPayload(formData, locale);
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const generatedSlug = slugify(getSlugSourceFromTranslations(locale, localizedTranslations));
  const normalizedSlug = rawSlug || generatedSlug;

  if ("error" in technicalAttributes) {
    return {
      error: technicalAttributes.error,
    };
  }

  if (!normalizedSlug) {
    return {
      error: adminText(locale, {
        uk: "Вкажіть назву товару або slug, щоб сформувати адресу сторінки.",
      }),
    } as const;
  }

  let brandIdForIngest: string;
  if (existingProductId) {
    const row = await db.product.findUnique({
      where: { id: existingProductId },
      select: { brandId: true },
    });
    brandIdForIngest = row?.brandId ?? (await getDefaultBrandId());
  } else {
    brandIdForIngest = await getDefaultBrandId();
  }

  const rawSku = String(formData.get("sku") ?? "").trim();
  let skuForIngest = rawSku;
  if (rawSku.length < 2) {
    if (!existingProductId) {
      skuForIngest = `AUTO-${slugify(normalizedSlug || "item")
        .replace(/-/g, "")
        .slice(0, 24)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase().slice(0, 64);
    } else {
      return {
        error: adminText(locale, {
          uk: "Вкажіть SKU (мінімум 2 символи).",
        }),
      } as const;
    }
  }

  const normalized = normalizeProductIngestPayload({
    locale: String(formData.get("locale") ?? "uk"),
    slug: normalizedSlug,
    sku: skuForIngest,
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    brandId: brandIdForIngest,
    status: String(formData.get("status") ?? "DRAFT"),
    price: String(formData.get("price") ?? ""),
    purchasePrice: normalizeOptionalText(formData.get("purchasePrice")),
    oldPrice: normalizeOptionalText(formData.get("oldPrice")),
    currency: String(formData.get("currency") ?? STOREFRONT_CURRENCY_CODE),
    inventoryStatus: String(formData.get("inventoryStatus") ?? "IN_STOCK"),
    stock: String(formData.get("stock") ?? "0"),
    heroImage,
    gallery: nextGallery,
    specs,
    metadata: metadataResult.data,
    technicalAttributes: technicalAttributes.data,
    translations: localizedTranslations,
  });

  if (!normalized.success) {
    return {
      error: adminText(locale, {
        uk: "Перевірте обов'язкові поля товару перед збереженням.",
      }),
    } as const;
  }

  if (!canManageFinancials) {
    const existingProduct = existingProductId
      ? await db.product.findUnique({
          where: {
            id: existingProductId,
          },
          select: {
            purchasePrice: true,
          },
        })
      : null;

    normalized.data.purchasePrice = existingProduct?.purchasePrice ?? null;
  }

  return {
    data: normalized.data,
  } as const;
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  const viewer = await requireAdminSession(locale);

  const payload = await buildProductPayload(
    formData,
    locale,
    undefined,
    canViewAdminFinancials(viewer.role),
  );

  if ("error" in payload) {
    return {
      status: "error",
      message: payload.error,
    };
  }

  const relations = await validateProductRelationTargets(payload.data);

  if (!relations.categoryExists) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Категорію не знайдено.",
      }),
    };
  }

  try {
    const product = await createProductRecord(payload.data);
    const intent = String(formData.get("intent") ?? "").trim();

    if (intent === "saveAndNew") {
      redirect(`/admin/products/new?created=1`);
    }

    redirect(`/admin/products/${product.id}/edit?created=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug і SKU мають бути унікальними.",
        }),
      };
    }

    return {
      status: "error",
      message: buildProductConflictMessage(locale, error),
    };
  }
}

export async function updateProductFormAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  const viewer = await requireAdminAccess(locale);
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося визначити товар для редагування.",
      }),
    };
  }

  const payload = await buildProductPayload(
    formData,
    locale,
    productId,
    canViewAdminFinancials(viewer.role),
  );

  if ("error" in payload) {
    return {
      status: "error",
      message: payload.error,
    };
  }

  const relations = await validateProductRelationTargets(payload.data);

  if (!relations.categoryExists) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Категорію не знайдено.",
      }),
    };
  }

  try {
    const {
      previousHeroImage,
      previousGallery,
      nextHeroImage,
      nextGallery,
    } = await updateProductRecord(productId, payload.data);
    const nextReferencedAssets = new Set([nextHeroImage, ...nextGallery]);
    const previousReferencedAssets = Array.from(new Set([previousHeroImage, ...previousGallery]));

    await Promise.all(
      previousReferencedAssets
        .filter((assetPath): assetPath is string => Boolean(assetPath))
        .filter((assetPath) => !nextReferencedAssets.has(assetPath))
        .map((assetPath) => safeDeleteUploadedProductAsset(assetPath)),
    );

    redirect(`/admin/products/${productId}/edit?saved=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    return {
      status: "error",
      message: buildProductConflictMessage(locale, error),
    };
  }
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  const viewer = await requireAdminAccess(locale);

  const payload = await buildProductPayload(
    formData,
    locale,
    productId,
    canViewAdminFinancials(viewer.role),
  );

  if ("error" in payload) {
    return {
      status: "error",
      message: payload.error,
    };
  }

  const relations = await validateProductRelationTargets(payload.data);

  if (!relations.categoryExists) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Категорію не знайдено.",
      }),
    };
  }

  try {
    const { previousGallery: currentGallery, nextGallery } = await updateProductRecord(
      productId,
      payload.data,
    );

    await Promise.all(
      currentGallery
        .filter((assetPath) => !nextGallery.includes(assetPath))
        .map((assetPath) => safeDeleteUploadedProductAsset(assetPath)),
    );

    redirect(`/admin/products/${productId}/edit?saved=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug і SKU мають бути унікальними.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити товар.",
      }),
    };
  }
}

export async function deleteProductAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    redirect(`/admin/products`);
  }

  const product = await db.product.findUnique({
    where: {
      id: productId,
    },
    select: {
      heroImage: true,
      gallery: true,
    },
  });

  if (product) {
    await db.product.delete({
      where: {
        id: productId,
      },
    });

    const gallery = parseJson<string[]>(product.gallery, []);
    await Promise.all(
      Array.from(new Set([product.heroImage, ...gallery])).map((assetPath) =>
        safeDeleteUploadedProductAsset(assetPath),
      ),
    );
  }

  redirect(`/admin/products?deleted=1`);
}

export async function updateAdminAccountAction(
  _prevState: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  const user = await requireAuthenticatedUser(locale);
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const nextPassword = String(formData.get("nextPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (name.length < 2 || email.length < 5) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте обов'язкові поля профілю перед збереженням.",
      }),
    };
  }

  const dbUser = await db.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!dbUser) {
    redirect(`/account`);
  }

  if (nextPassword || confirmPassword || currentPassword) {
    if (!dbUser.passwordHash) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Для цього акаунта зміна пароля недоступна.",
        }),
      };
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);

    if (!isCurrentValid) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Поточний пароль вказано неправильно.",
        }),
      };
    }

    if (nextPassword.length < 8) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Новий пароль має містити щонайменше 8 символів.",
        }),
      };
    }

    if (nextPassword !== confirmPassword) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Підтвердження пароля не збігається.",
        }),
      };
    }
  }

  try {
    await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
        email,
        ...(nextPassword
          ? {
              passwordHash: await bcrypt.hash(nextPassword, 12),
            }
          : {}),
      },
    });

    return {
      status: "success",
      message: adminText(locale, {
        uk: "Профіль оновлено.",
      }),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Цей email уже використовується.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити профіль.",
      }),
    };
  }
}

export async function updateSiteSettingsAction(
  _prevState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  const locale = defaultLocale;
  await requireAdminOnlyAccess(locale);

  const parsed = siteSettingsSchema.safeParse({
    siteMode: String(formData.get("siteMode") ?? SITE_MODES.pcBuild),
    assemblyBaseFeeUah: String(formData.get("assemblyBaseFeeUah") ?? "0"),
    assemblyPercent: String(formData.get("assemblyPercent") ?? "0"),
    brandName: String(formData.get("brandName") ?? "").trim(),
    shortBrandName: normalizeOptionalText(formData.get("shortBrandName")),
    logoText: normalizeOptionalText(formData.get("logoText")),
    supportEmail: String(formData.get("supportEmail") ?? "").trim(),
    supportPhone: String(formData.get("supportPhone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    facebookUrl: normalizeOptionalText(formData.get("facebookUrl")),
    instagramUrl: normalizeOptionalText(formData.get("instagramUrl")),
    telegramUrl: normalizeOptionalText(formData.get("telegramUrl")),
    youtubeUrl: normalizeOptionalText(formData.get("youtubeUrl")),
    metaTitle: normalizeOptionalText(formData.get("metaTitle")),
    metaDescription: normalizeOptionalText(formData.get("metaDescription")),
    defaultCurrency: String(formData.get("defaultCurrency") ?? STOREFRONT_CURRENCY_CODE)
      .trim()
      .toUpperCase(),
    defaultLocale: String(formData.get("defaultLocale") ?? "uk"),
    watermarkText: String(formData.get("watermarkText") ?? "").trim(),
    heroTitle: String(formData.get("heroTitle") ?? "").trim(),
    heroSubtitle: String(formData.get("heroSubtitle") ?? "").trim(),
    heroCtaLabel: String(formData.get("heroCtaLabel") ?? "").trim(),
    heroCtaHref: String(formData.get("heroCtaHref") ?? "").trim(),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте обов'язкові поля налаштувань сайту перед збереженням.",
      }),
    };
  }

  const current = await db.siteSettings.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
  });

  const logoFile = formData.get("logoFile");
  const faviconFile = formData.get("faviconFile");
  let logoPath = String(formData.get("logoPathCurrent") ?? "").trim();
  let faviconPath = String(formData.get("faviconPathCurrent") ?? "").trim();

  if (isFile(logoFile)) {
    const uploaded = await saveUploadedAsset(logoFile, SITE_UPLOAD_DIR, "/uploads/site");
    await safeDeleteManagedAsset(current?.logoPath);
    logoPath = uploaded;
  }

  if (isFile(faviconFile)) {
    const uploaded = await saveUploadedAsset(faviconFile, SITE_UPLOAD_DIR, "/uploads/site");
    await safeDeleteManagedAsset(current?.faviconPath);
    faviconPath = uploaded;
  }

  const featuredCategorySlugs = formData
    .getAll("featuredCategorySlugs")
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  const featuredProductIds = formData
    .getAll("featuredProductIds")
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);

  const data = {
    ...parsed.data,
    logoText: parsed.data.logoText ?? "",
    metaTitle: parsed.data.metaTitle ?? "",
    metaDescription: parsed.data.metaDescription ?? "",
    logoPath: logoPath || null,
    faviconPath: faviconPath || null,
    featuredCategorySlugs: JSON.stringify(featuredCategorySlugs),
    featuredProductIds: JSON.stringify(featuredProductIds),
  };

  if (current) {
    await db.siteSettings.update({
      where: {
        id: current.id,
      },
      data,
    });
  } else {
    await db.siteSettings.create({
      data,
    });
  }

  return {
    status: "success",
    message: adminText(locale, {
      uk: "Налаштування сайту оновлено.",
    }),
  };
}

export async function createBannerAction(
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);

  const translations = buildLocalizedBannerTranslations(formData);
  const parsed = bannerBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    key: slugify(String(formData.get("key") ?? "")),
    type: String(formData.get("type") ?? "PROMO").trim().toUpperCase(),
    href: normalizeOptionalText(formData.get("href")),
    isActive: String(formData.get("isActive") ?? "") === "on",
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!translations || !parsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля банера перед збереженням.",
      }),
    };
  }

  const imageFile = formData.get("imageFile");
  let imagePath = String(formData.get("imageCurrent") ?? "").trim();

  if (isFile(imageFile)) {
    imagePath = await saveUploadedAsset(imageFile, BANNER_UPLOAD_DIR, "/uploads/banners");
  }

  try {
    const banner = await db.banner.create({
      data: {
        key: parsed.data.key,
        type: parsed.data.type,
        href: parsed.data.href,
        isActive: parsed.data.isActive,
        sortOrder: parsed.data.sortOrder,
        image: imagePath || null,
        translations: {
          create: translations,
        },
      },
    });

    redirect(`/admin/banners/${banner.id}/edit?created=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Ключ банера має бути унікальним.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити банер.",
      }),
    };
  }
}

export async function updateBannerAction(
  bannerId: string,
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);

  const translations = buildLocalizedBannerTranslations(formData);
  const parsed = bannerBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    key: slugify(String(formData.get("key") ?? "")),
    type: String(formData.get("type") ?? "PROMO").trim().toUpperCase(),
    href: normalizeOptionalText(formData.get("href")),
    isActive: String(formData.get("isActive") ?? "") === "on",
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!translations || !parsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля банера перед збереженням.",
      }),
    };
  }

  const current = await db.banner.findUnique({
    where: { id: bannerId },
    select: { image: true },
  });
  const imageFile = formData.get("imageFile");
  let imagePath = String(formData.get("imageCurrent") ?? "").trim();

  if (isFile(imageFile)) {
    imagePath = await saveUploadedAsset(imageFile, BANNER_UPLOAD_DIR, "/uploads/banners");
    await safeDeleteManagedAsset(current?.image);
  }

  try {
    await db.banner.update({
      where: { id: bannerId },
      data: {
        key: parsed.data.key,
        type: parsed.data.type,
        href: parsed.data.href,
        isActive: parsed.data.isActive,
        sortOrder: parsed.data.sortOrder,
        image: imagePath || null,
        translations: {
          deleteMany: {},
          create: translations,
        },
      },
    });

    redirect(`/admin/banners/${bannerId}/edit?saved=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Ключ банера має бути унікальним.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити банер.",
      }),
    };
  }
}

export async function deleteBannerAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);
  const bannerId = String(formData.get("bannerId") ?? "").trim();

  if (!bannerId) {
    redirect(`/admin/banners`);
  }

  const banner = await db.banner.findUnique({
    where: {
      id: bannerId,
    },
    select: {
      image: true,
    },
  });

  if (banner) {
    await db.banner.delete({
      where: {
        id: bannerId,
      },
    });
    await safeDeleteManagedAsset(banner.image);
  }

  redirect(`/admin/banners?deleted=1`);
}

export async function createCategoryAction(
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);

  const translations = buildLocalizedCategoryTranslations(formData);
  if (!translations) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте назви категорії (мінімум 2 символи хоча б для однієї мови).",
      }),
    };
  }

  const resolvedSlug = resolveCategorySlug(formData, translations);
  const baseParsed = categoryBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    slug: resolvedSlug,
    parentId: normalizeOptionalText(formData.get("parentId")),
    image: normalizeOptionalText(formData.get("image")),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!baseParsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте slug (мінімум 2 символи) або назву для автогенерації slug.",
      }),
    };
  }

  try {
    const category = await db.category.create({
      data: {
        slug: baseParsed.data.slug,
        parentId: baseParsed.data.parentId,
        image: baseParsed.data.image,
        sortOrder: baseParsed.data.sortOrder,
        translations: {
          create: translations,
        },
      },
    });

    redirect(`/admin/categories/${category.id}/edit?created=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug категорії має бути унікальним.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити категорію.",
      }),
    };
  }
}

export async function updateCategoryAction(
  categoryId: string,
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);

  const translations = buildLocalizedCategoryTranslations(formData);
  if (!translations) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте назви категорії (мінімум 2 символи хоча б для однієї мови).",
      }),
    };
  }

  const resolvedSlug = resolveCategorySlug(formData, translations);
  const baseParsed = categoryBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    slug: resolvedSlug,
    parentId: normalizeOptionalText(formData.get("parentId")),
    image: normalizeOptionalText(formData.get("image")),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!baseParsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте slug (мінімум 2 символи) або назву для автогенерації slug.",
      }),
    };
  }

  if (baseParsed.data.parentId === categoryId) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Категорія не може бути батьківською сама для себе.",
      }),
    };
  }

  if (await wouldCreateCategoryCycle(categoryId, baseParsed.data.parentId)) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Таке батьківське значення створить цикл у структурі категорій.",
      }),
    };
  }

  try {
    await db.category.update({
      where: {
        id: categoryId,
      },
      data: {
        slug: baseParsed.data.slug,
        parentId: baseParsed.data.parentId,
        image: baseParsed.data.image,
        sortOrder: baseParsed.data.sortOrder,
        translations: {
          deleteMany: {},
          create: translations,
        },
      },
    });

    redirect(`/admin/categories/${categoryId}/edit?saved=1`);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug категорії має бути унікальним.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити категорію.",
      }),
    };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    redirect(`/admin/categories`);
  }

  const category = await db.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  });

  if (!category) {
    redirect(`/admin/categories`);
  }

  if (category._count.products > 0 || category._count.children > 0) {
    redirect(`/admin/categories?error=category-in-use`);
  }

  await db.category.delete({
    where: {
      id: categoryId,
    },
  });

  redirect(`/admin/categories?deleted=1`);
}

function parseOptionalDateTimeInput(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);

  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function parseOptionalUsageLimit(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number.parseInt(trimmed, 10);

  if (!Number.isFinite(numeric) || numeric < 1) {
    return null;
  }

  return numeric;
}

const promoCodeFormSchema = z
  .object({
    code: z.string().trim().min(2).max(40),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).optional().default(""),
    type: z.nativeEnum(PromoCodeType),
    value: z.coerce.number().int().min(0),
    isActive: z.boolean(),
    usageLimit: z.string().optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENT_DISCOUNT" && (data.value < 1 || data.value > 100)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Для відсоткової знижки вкажіть значення від 1 до 100.",
        path: ["value"],
      });
    }

    if (data.type === "FIXED_DISCOUNT" && data.value <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Для фіксованої знижки вкажіть суму більшу за 0 (у копійках).",
        path: ["value"],
      });
    }
  });

export async function createPromoCodeAction(
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);

  const parsed = promoCodeFormSchema.safeParse({
    code: String(formData.get("code") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? "") as PromoCodeType,
    value: String(formData.get("value") ?? "0"),
    isActive: String(formData.get("isActive") ?? "") === "on",
    usageLimit: String(formData.get("usageLimit") ?? ""),
    validFrom: String(formData.get("validFrom") ?? ""),
    validUntil: String(formData.get("validUntil") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля промокоду.",
      }),
    };
  }

  const codeKey = normalizePromoCodeKey(parsed.data.code);
  const existing = await db.promoCode.findUnique({
    where: {
      codeKey,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Промокод з таким кодом уже існує.",
      }),
    };
  }

  try {
    await db.promoCode.create({
      data: {
        codeKey,
        code: parsed.data.code.trim(),
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        type: parsed.data.type,
        value: parsed.data.type === "FREE_BUILD" ? 0 : parsed.data.value,
        isActive: parsed.data.isActive,
        usageLimit: parseOptionalUsageLimit(parsed.data.usageLimit),
        validFrom: parseOptionalDateTimeInput(parsed.data.validFrom),
        validUntil: parseOptionalDateTimeInput(parsed.data.validUntil),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Промокод з таким кодом уже існує.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити промокод.",
      }),
    };
  }

  redirect(`/admin/promo-codes?created=1`);
}

export async function updatePromoCodeAction(
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не знайдено промокод.",
      }),
    };
  }

  const parsed = promoCodeFormSchema.safeParse({
    code: String(formData.get("code") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    type: String(formData.get("type") ?? "") as PromoCodeType,
    value: String(formData.get("value") ?? "0"),
    isActive: String(formData.get("isActive") ?? "") === "on",
    usageLimit: String(formData.get("usageLimit") ?? ""),
    validFrom: String(formData.get("validFrom") ?? ""),
    validUntil: String(formData.get("validUntil") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля промокоду.",
      }),
    };
  }

  const codeKey = normalizePromoCodeKey(parsed.data.code);
  const duplicate = await db.promoCode.findFirst({
    where: {
      codeKey,
      NOT: {
        id,
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Промокод з таким кодом уже існує.",
      }),
    };
  }

  try {
    await db.promoCode.update({
      where: {
        id,
      },
      data: {
        codeKey,
        code: parsed.data.code.trim(),
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        type: parsed.data.type,
        value: parsed.data.type === "FREE_BUILD" ? 0 : parsed.data.value,
        isActive: parsed.data.isActive,
        usageLimit: parseOptionalUsageLimit(parsed.data.usageLimit),
        validFrom: parseOptionalDateTimeInput(parsed.data.validFrom),
        validUntil: parseOptionalDateTimeInput(parsed.data.validUntil),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Промокод з таким кодом уже існує.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити промокод.",
      }),
    };
  }

  redirect(`/admin/promo-codes?saved=1`);
}
