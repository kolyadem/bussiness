"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
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
import { locales, type AppLocale } from "@/lib/constants";
import { db } from "@/lib/db";
import { parseJson, slugify } from "@/lib/utils";

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

function adminText(locale: AppLocale, copy: { uk: string; ru: string; en: string }) {
  return copy[locale] ?? copy.en;
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
      data: parsed as Record<string, string | number | boolean>,
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
      ru: "Не удалось сохранить товар.",
      en: "Unable to save product.",
    });
  }

  const uniqueError = error as Prisma.PrismaClientKnownRequestError;
  const target = Array.isArray(uniqueError.meta?.target)
    ? uniqueError.meta.target.map((value) => String(value))
    : [];

  if (target.includes("slug")) {
    return adminText(locale, {
      uk: "Такий адрес сторінки вже використовується. Вкажіть інший slug.",
      ru: "Такой адрес страницы уже используется. Укажите другой slug.",
      en: "This page address is already in use. Choose a different slug.",
    });
  }

  if (target.includes("sku")) {
    return adminText(locale, {
      uk: "Такий SKU уже існує. Вкажіть інший артикул.",
      ru: "Такой SKU уже существует. Укажите другой артикул.",
      en: "This SKU already exists. Enter a different SKU.",
    });
  }

  return adminText(locale, {
    uk: "Slug і SKU мають бути унікальними.",
    ru: "Slug и SKU должны быть уникальными.",
    en: "Slug and SKU must be unique.",
  });
}

const localizedBrandSchema = z.object({
  locale: z.enum(locales),
  name: z.string().trim().min(2).max(120),
  summary: z.string().trim().max(240).optional(),
});

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

const brandBaseSchema = z.object({
  locale: z.enum(locales),
  slug: z.string().trim().min(2).max(120),
  logo: z.string().trim().nullable(),
  website: z.string().trim().nullable(),
  sortOrder: z.coerce.number().int().min(0),
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

const siteSettingsSchema = z.object({
  siteMode: z.enum([SITE_MODES.store, SITE_MODES.pcBuild]),
  brandName: z.string().trim().min(2).max(120),
  shortBrandName: z.string().trim().max(40).nullable(),
  logoText: z.string().trim().max(40).nullable(),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().min(5).max(40),
  address: z.string().trim().min(2).max(200),
  facebookUrl: z.string().trim().nullable(),
  instagramUrl: z.string().trim().nullable(),
  telegramUrl: z.string().trim().nullable(),
  youtubeUrl: z.string().trim().nullable(),
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

function buildLocalizedBrandTranslations(formData: FormData) {
  const translations = locales.map((locale) => ({
    locale,
    name: String(formData.get(`name:${locale}`) ?? "").trim(),
    summary: String(formData.get(`summary:${locale}`) ?? "").trim(),
  }));
  const parsed = z.array(localizedBrandSchema).safeParse(translations);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.map((item) => ({
    ...item,
    summary: item.summary || null,
  }));
}

function buildLocalizedCategoryTranslations(formData: FormData) {
  const translations = locales.map((locale) => ({
    locale,
    name: String(formData.get(`name:${locale}`) ?? "").trim(),
    description: String(formData.get(`description:${locale}`) ?? "").trim(),
  }));
  const parsed = z.array(localizedCategorySchema).safeParse(translations);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.map((item) => ({
    ...item,
    description: item.description || null,
  }));
}

function buildLocalizedBannerTranslations(formData: FormData) {
  const translations = locales.map((locale) => ({
    locale,
    title: String(formData.get(`title:${locale}`) ?? "").trim(),
    subtitle: String(formData.get(`subtitle:${locale}`) ?? "").trim(),
    ctaLabel: String(formData.get(`ctaLabel:${locale}`) ?? "").trim(),
  }));
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
  const translations = locales.map((locale) => ({
    locale,
    name: String(formData.get(`name:${locale}`) ?? "").trim(),
    shortDescription: String(formData.get(`shortDescription:${locale}`) ?? "").trim(),
    description: String(formData.get(`description:${locale}`) ?? "").trim(),
    seoTitle: String(formData.get(`seoTitle:${locale}`) ?? "").trim(),
    seoDescription: String(formData.get(`seoDescription:${locale}`) ?? "").trim(),
  }));

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
          ru: `Поле "${getTechnicalAttributeLabel(definition, locale)}" содержит некорректное значение.`,
          en: `"${getTechnicalAttributeLabel(definition, locale)}" contains an invalid value.`,
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
  const priority = [locale, "uk", "ru", "en"];

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
        uk: "Заповніть локалізовані поля товару для всіх мов.",
        ru: "Заполните локализованные поля товара для всех языков.",
        en: "Fill in the localized product fields for every language.",
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
        uk: "Додайте головне фото товару.",
        ru: "Добавьте главное фото товара.",
        en: "Add a main product image.",
      }),
    } as const;
  }

  const metadataResult = parseMetadataPayload(metadataValue);

  if (!metadataResult.success) {
    return {
      error: adminText(locale, {
        uk: "Поле metadata повинно містити коректний JSON-об'єкт.",
        ru: "Поле metadata должно содержать корректный JSON-объект.",
        en: "Metadata must contain a valid JSON object.",
      }),
    } as const;
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
        ru: "Укажите название товара или slug, чтобы сформировать адрес страницы.",
        en: "Add a product name or slug so we can build the page address.",
      }),
    } as const;
  }

  const normalized = normalizeProductIngestPayload({
    locale: String(formData.get("locale") ?? "uk"),
    slug: normalizedSlug,
    sku: String(formData.get("sku") ?? ""),
    categoryId: String(formData.get("categoryId") ?? "").trim(),
    brandId: String(formData.get("brandId") ?? "").trim(),
    status: String(formData.get("status") ?? "DRAFT"),
    price: String(formData.get("price") ?? ""),
    purchasePrice: normalizeOptionalText(formData.get("purchasePrice")),
    oldPrice: normalizeOptionalText(formData.get("oldPrice")),
    currency: String(formData.get("currency") ?? "USD"),
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
        ru: "Проверьте обязательные поля товара перед сохранением.",
        en: "Check the required product fields before saving.",
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

  if (!relations.brandExists || !relations.categoryExists) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Бренд або категорію не знайдено.",
        ru: "Бренд или категория не найдены.",
        en: "Brand or category was not found.",
      }),
    };
  }

  try {
    const product = await createProductRecord(payload.data);

    redirect(`/${payload.data.locale}/admin/products/${product.id}/edit?created=1`);
  } catch (error) {
    return {
      status: "error",
      message: buildProductConflictMessage(locale, error),
    };

    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug і SKU мають бути унікальними.",
          ru: "Slug и SKU должны быть уникальными.",
          en: "Slug and SKU must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити товар.",
        ru: "Не удалось создать товар.",
        en: "Unable to create product.",
      }),
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
        ru: "Не удалось определить товар для редактирования.",
        en: "Unable to determine which product should be updated.",
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

  if (!relations.brandExists || !relations.categoryExists) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Бренд або категорію не знайдено.",
        ru: "Бренд или категория не найдены.",
        en: "Brand or category was not found.",
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

    redirect(`/${payload.data.locale}/admin/products/${productId}/edit?saved=1`);
  } catch (error) {
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

  if (!relations.brandExists || !relations.categoryExists) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Бренд або категорію не знайдено.",
        ru: "Бренд или категория не найдены.",
        en: "Brand or category was not found.",
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

    redirect(`/${payload.data.locale}/admin/products/${productId}/edit?saved=1`);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug і SKU мають бути унікальними.",
          ru: "Slug и SKU должны быть уникальными.",
          en: "Slug and SKU must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити товар.",
        ru: "Не удалось обновить товар.",
        en: "Unable to update product.",
      }),
    };
  }
}

export async function deleteProductAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) {
    redirect(`/${locale}/admin/products`);
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

  redirect(`/${locale}/admin/products?deleted=1`);
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
        ru: "Проверьте обязательные поля профиля перед сохранением.",
        en: "Check the required account fields before saving.",
      }),
    };
  }

  const dbUser = await db.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!dbUser) {
    redirect(`/${locale}/account`);
  }

  if (nextPassword || confirmPassword || currentPassword) {
    if (!dbUser.passwordHash) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Для цього акаунта зміна пароля недоступна.",
          ru: "Для этого аккаунта смена пароля недоступна.",
          en: "Password change is unavailable for this account.",
        }),
      };
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);

    if (!isCurrentValid) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Поточний пароль вказано неправильно.",
          ru: "Текущий пароль указан неверно.",
          en: "Current password is incorrect.",
        }),
      };
    }

    if (nextPassword.length < 8) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Новий пароль має містити щонайменше 8 символів.",
          ru: "Новый пароль должен содержать не меньше 8 символов.",
          en: "New password must be at least 8 characters.",
        }),
      };
    }

    if (nextPassword !== confirmPassword) {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Підтвердження пароля не збігається.",
          ru: "Подтверждение пароля не совпадает.",
          en: "Password confirmation does not match.",
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
        ru: "Профиль обновлён.",
        en: "Account updated.",
      }),
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Цей email уже використовується.",
          ru: "Этот email уже используется.",
          en: "This email is already in use.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити профіль.",
        ru: "Не удалось обновить профиль.",
        en: "Unable to update account.",
      }),
    };
  }
}

export async function updateSiteSettingsAction(
  _prevState: SiteSettingsFormState,
  formData: FormData,
): Promise<SiteSettingsFormState> {
  const locale = (String(formData.get("defaultLocale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);

  const parsed = siteSettingsSchema.safeParse({
    siteMode: String(formData.get("siteMode") ?? SITE_MODES.store),
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
    defaultCurrency: String(formData.get("defaultCurrency") ?? "USD").trim().toUpperCase(),
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
        ru: "Проверьте обязательные поля настроек сайта перед сохранением.",
        en: "Check the required site settings fields before saving.",
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
      ru: "Настройки сайта обновлены.",
      en: "Site settings updated.",
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
        ru: "Проверьте поля баннера перед сохранением.",
        en: "Check banner fields before saving.",
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

    redirect(`/${parsed.data.locale}/admin/banners/${banner.id}/edit?created=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Ключ банера має бути унікальним.",
          ru: "Ключ баннера должен быть уникальным.",
          en: "Banner key must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити банер.",
        ru: "Не удалось создать баннер.",
        en: "Unable to create banner.",
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
        ru: "Проверьте поля баннера перед сохранением.",
        en: "Check banner fields before saving.",
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

    redirect(`/${parsed.data.locale}/admin/banners/${bannerId}/edit?saved=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Ключ банера має бути унікальним.",
          ru: "Ключ баннера должен быть уникальным.",
          en: "Banner key must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити банер.",
        ru: "Не удалось обновить баннер.",
        en: "Unable to update banner.",
      }),
    };
  }
}

export async function deleteBannerAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminOnlyAccess(locale);
  const bannerId = String(formData.get("bannerId") ?? "").trim();

  if (!bannerId) {
    redirect(`/${locale}/admin/banners`);
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

  redirect(`/${locale}/admin/banners?deleted=1`);
}

export async function createBrandAction(
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);

  const translations = buildLocalizedBrandTranslations(formData);
  const baseParsed = brandBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    slug: slugify(String(formData.get("slug") ?? "")),
    logo: normalizeOptionalText(formData.get("logo")),
    website: normalizeOptionalText(formData.get("website")),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!translations || !baseParsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля бренду перед збереженням.",
        ru: "Проверьте поля бренда перед сохранением.",
        en: "Check brand fields before saving.",
      }),
    };
  }

  try {
    const brand = await db.brand.create({
      data: {
        slug: baseParsed.data.slug,
        logo: baseParsed.data.logo,
        website: baseParsed.data.website,
        sortOrder: baseParsed.data.sortOrder,
        translations: {
          create: translations,
        },
      },
    });

    redirect(`/${baseParsed.data.locale}/admin/brands/${brand.id}/edit?created=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug бренду має бути унікальним.",
          ru: "Slug бренда должен быть уникальным.",
          en: "Brand slug must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити бренд.",
        ru: "Не удалось создать бренд.",
        en: "Unable to create brand.",
      }),
    };
  }
}

export async function updateBrandAction(
  brandId: string,
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);

  const translations = buildLocalizedBrandTranslations(formData);
  const baseParsed = brandBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    slug: slugify(String(formData.get("slug") ?? "")),
    logo: normalizeOptionalText(formData.get("logo")),
    website: normalizeOptionalText(formData.get("website")),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!translations || !baseParsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля бренду перед збереженням.",
        ru: "Проверьте поля бренда перед сохранением.",
        en: "Check brand fields before saving.",
      }),
    };
  }

  try {
    await db.brand.update({
      where: {
        id: brandId,
      },
      data: {
        slug: baseParsed.data.slug,
        logo: baseParsed.data.logo,
        website: baseParsed.data.website,
        sortOrder: baseParsed.data.sortOrder,
        translations: {
          deleteMany: {},
          create: translations,
        },
      },
    });

    redirect(`/${baseParsed.data.locale}/admin/brands/${brandId}/edit?saved=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug бренду має бути унікальним.",
          ru: "Slug бренда должен быть уникальным.",
          en: "Brand slug must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити бренд.",
        ru: "Не удалось обновить бренд.",
        en: "Unable to update brand.",
      }),
    };
  }
}

export async function deleteBrandAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);
  const brandId = String(formData.get("brandId") ?? "").trim();

  if (!brandId) {
    redirect(`/${locale}/admin/brands`);
  }

  const brand = await db.brand.findUnique({
    where: {
      id: brandId,
    },
    select: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!brand) {
    redirect(`/${locale}/admin/brands`);
  }

  if (brand._count.products > 0) {
    redirect(`/${locale}/admin/brands?error=brand-in-use`);
  }

  await db.brand.delete({
    where: {
      id: brandId,
    },
  });

  redirect(`/${locale}/admin/brands?deleted=1`);
}

export async function createCategoryAction(
  _prevState: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);

  const translations = buildLocalizedCategoryTranslations(formData);
  const baseParsed = categoryBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    slug: slugify(String(formData.get("slug") ?? "")),
    parentId: normalizeOptionalText(formData.get("parentId")),
    image: normalizeOptionalText(formData.get("image")),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!translations || !baseParsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля категорії перед збереженням.",
        ru: "Проверьте поля категории перед сохранением.",
        en: "Check category fields before saving.",
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

    redirect(`/${baseParsed.data.locale}/admin/categories/${category.id}/edit?created=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug категорії має бути унікальним.",
          ru: "Slug категории должен быть уникальным.",
          en: "Category slug must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося створити категорію.",
        ru: "Не удалось создать категорию.",
        en: "Unable to create category.",
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
  const baseParsed = categoryBaseSchema.safeParse({
    locale: String(formData.get("locale") ?? "uk"),
    slug: slugify(String(formData.get("slug") ?? "")),
    parentId: normalizeOptionalText(formData.get("parentId")),
    image: normalizeOptionalText(formData.get("image")),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });

  if (!translations || !baseParsed.success) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Перевірте поля категорії перед збереженням.",
        ru: "Проверьте поля категории перед сохранением.",
        en: "Check category fields before saving.",
      }),
    };
  }

  if (baseParsed.data.parentId === categoryId) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Категорія не може бути батьківською сама для себе.",
        ru: "Категория не может быть родительской сама для себя.",
        en: "A category cannot be its own parent.",
      }),
    };
  }

  if (await wouldCreateCategoryCycle(categoryId, baseParsed.data.parentId)) {
    return {
      status: "error",
      message: adminText(locale, {
        uk: "Таке батьківське значення створить цикл у структурі категорій.",
        ru: "Такой родитель создаст цикл в структуре категорий.",
        en: "This parent selection would create a category loop.",
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

    redirect(`/${baseParsed.data.locale}/admin/categories/${categoryId}/edit?saved=1`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: adminText(locale, {
          uk: "Slug категорії має бути унікальним.",
          ru: "Slug категории должен быть уникальным.",
          en: "Category slug must be unique.",
        }),
      };
    }

    return {
      status: "error",
      message: adminText(locale, {
        uk: "Не вдалося оновити категорію.",
        ru: "Не удалось обновить категорию.",
        en: "Unable to update category.",
      }),
    };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  const locale = (String(formData.get("locale") ?? "uk") as AppLocale) || "uk";
  await requireAdminAccess(locale);
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!categoryId) {
    redirect(`/${locale}/admin/categories`);
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
    redirect(`/${locale}/admin/categories`);
  }

  if (category._count.products > 0 || category._count.children > 0) {
    redirect(`/${locale}/admin/categories?error=category-in-use`);
  }

  await db.category.delete({
    where: {
      id: categoryId,
    },
  });

  redirect(`/${locale}/admin/categories?deleted=1`);
}
