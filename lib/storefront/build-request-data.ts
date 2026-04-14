import type { Prisma, PromoCodeType } from "@prisma/client";
import { z } from "zod";
import type { AppLocale } from "@/lib/constants";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { evaluateBuildCompatibility } from "@/lib/compatibility";
import { getCompatibilityFallbackMessage } from "@/lib/compatibility/messages";
import { notifyBuildRequestCreated } from "@/lib/notifications/build-request-notifier";
import {
  buildConfiguratorSlugCandidate,
  getConfiguratorDefaultName,
  getConfiguratorSlotLabel,
  isConfiguratorSlotKey,
} from "@/lib/storefront/configurator";
import { STOREFRONT_CURRENCY_CODE } from "@/lib/utils";
import { mapProduct } from "@/lib/storefront/queries";
import {
  BUILD_REQUEST_DELIVERY_METHODS,
  isBuildRequestStatus,
  resolveUkraineCity,
  type BuildRequestDeliveryMethod,
  type BuildRequestSnapshotItem,
  type BuildRequestStatus,
} from "@/lib/storefront/build-requests";
import { normalizeTelegramUsernameInput } from "@/lib/storefront/telegram-username";
import {
  computePromoMonetaryEffect,
  normalizePromoCodeKey,
  PROMO_ERROR_MESSAGES_UK,
  validatePromoRecordWindow,
  validatePromoValueShape,
} from "@/lib/storefront/promo-codes";
import {
  computePcAssemblyServiceFeeUah,
  resolveAssemblyFeeSettings,
} from "@/lib/storefront/pc-assembly-fee";

const MIN_BUILD_REQUEST_BUDGET = 100;
const MAX_BUILD_REQUEST_BUDGET = 500_000;
const ADMIN_BUILD_REQUEST_SORTS = [
  "created_desc",
  "created_asc",
  "updated_desc",
  "updated_asc",
] as const;

export type AdminBuildRequestSort = (typeof ADMIN_BUILD_REQUEST_SORTS)[number];

const buildRequestSchema = z
  .object({
    locale: z.literal("uk"),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(32),
    email: z.string().trim().email(),
    comment: z.string().trim().max(1000).optional().or(z.literal("")),
    deliveryCity: z.string().trim().min(2).max(120),
    deliveryMethod: z.enum(BUILD_REQUEST_DELIVERY_METHODS),
    deliveryBranch: z.string().trim().max(32).optional().or(z.literal("")),
    telegramUsername: z.string().trim().max(64).optional().or(z.literal("")),
    promoCode: z.string().trim().max(64).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryMethod === "NOVA_POSHTA_BRANCH") {
      const branch = (data.deliveryBranch ?? "").trim();

      if (branch.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryBranch"],
          message: "Вкажіть номер відділення Нової пошти",
        });
      } else if (!/^[\dA-Za-z#\-/]{1,32}$/.test(branch)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["deliveryBranch"],
          message: "Некоректний номер відділення",
        });
      }
    }

    const tg = data.telegramUsername?.trim();

    if (tg && !normalizeTelegramUsernameInput(tg)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telegramUsername"],
        message: "Некоректний нік у Telegram (наприклад, @username)",
      });
    }
  });

const quickBuildRequestSchema = z
  .object({
    locale: z.literal("uk"),
    fullName: z.string().trim().min(2).max(120),
    contact: z.string().trim().min(3).max(160),
    budget: z.string().trim().min(1).max(40),
    useCase: z.string().trim().min(5).max(500),
    preferences: z.string().trim().max(1000).optional().or(z.literal("")),
    needsMonitor: z.boolean().default(false),
    needsPeripherals: z.boolean().default(false),
    needsUpgrade: z.boolean().default(false),
    source: z.string().trim().max(180).optional().or(z.literal("")),
    website: z.string().trim().max(0).optional().or(z.literal("")),
    telegramUsername: z.string().trim().max(64).optional().or(z.literal("")),
    promoCode: z.string().trim().max(64).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const tg = data.telegramUsername?.trim();

    if (tg && !normalizeTelegramUsernameInput(tg)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["telegramUsername"],
        message: "Некоректний нік у Telegram (наприклад, @username)",
      });
    }
  });

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: string, maxLength: number) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function containsUnsafeInput(value: string) {
  return /<[^>]*>|https?:\/\/|www\.|t\.me\/joinchat|javascript:/i.test(value);
}

function hasExcessiveRepeats(value: string) {
  return /(.)\1{5,}/.test(value);
}

function normalizeContactValue(rawValue: string) {
  const normalized = normalizeWhitespace(rawValue);

  if (!normalized) {
    return null;
  }

  const emailCandidate = normalized.toLowerCase();
  const emailResult = z.string().email().safeParse(emailCandidate);

  if (emailResult.success) {
    return emailResult.data;
  }

  const telegramHandle = normalized.match(/^@([a-zA-Z0-9_]{5,32})$/);

  if (telegramHandle) {
    return `@${telegramHandle[1].toLowerCase()}`;
  }

  const telegramLink = normalized.match(/^(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{5,32})\/?$/i);

  if (telegramLink) {
    return `@${telegramLink[1].toLowerCase()}`;
  }

  const normalizedPhone = normalized.replace(/[^\d+]/g, "");
  const phoneDigits = normalizedPhone.replace(/\D/g, "");

  if (phoneDigits.length >= 7 && phoneDigits.length <= 15) {
    if (normalizedPhone.startsWith("+")) {
      return `+${phoneDigits}`;
    }

    return phoneDigits;
  }

  return null;
}

function normalizeCustomerName(rawValue: string) {
  return normalizeWhitespace(rawValue).slice(0, 120);
}

function parseBudgetToMinorUnits(rawValue: string) {
  const normalized = rawValue.replace(/[^\d.,]/g, "").replace(",", ".");
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric) || numeric < MIN_BUILD_REQUEST_BUDGET || numeric > MAX_BUILD_REQUEST_BUDGET) {
    return null;
  }

  return Math.round(numeric * 100);
}

function normalizeAdminBuildRequestSort(value: string | null | undefined): AdminBuildRequestSort {
  return ADMIN_BUILD_REQUEST_SORTS.includes(value as AdminBuildRequestSort)
    ? (value as AdminBuildRequestSort)
    : "created_desc";
}

async function generateUniqueBuildSlug(name: string, locale: AppLocale) {
  const base = buildConfiguratorSlugCandidate(name, locale);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const existing = await db.pcBuild.findFirst({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

async function generateUniqueShareToken() {
  while (true) {
    const candidate = crypto.randomUUID().replace(/-/g, "");
    const existing = await db.pcBuild.findFirst({
      where: { shareToken: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }
}

async function getBuildRequestRecord(slug: string) {
  return db.pcBuild.findFirst({
    where: {
      slug,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              translations: true,
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
              attributes: {
                include: {
                  attribute: true,
                },
              },
              reviews: {
                where: {
                  status: "APPROVED",
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

function serializeBuildItems(
  locale: AppLocale,
  items: NonNullable<Awaited<ReturnType<typeof getBuildRequestRecord>>>["items"],
) {
  return items.flatMap((item) => {
    if (!isConfiguratorSlotKey(item.slot)) {
      return [];
    }

    const product = mapProduct(item.product, locale);

    return [
      {
        slot: item.slot,
        slotLabel: getConfiguratorSlotLabel(item.slot, locale),
        quantity: item.quantity,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        heroImage: product.heroImage,
        brandName: product.category.name,
        price: product.price,
        currency: product.currency,
      } satisfies BuildRequestSnapshotItem,
    ];
  });
}

export function getBuildRequestFormPrefill(
  profile:
    | null
    | {
        name: string | null;
        email: string | null;
        phone: string | null;
      },
) {
  return {
    fullName: profile?.name ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    comment: "",
    deliveryCity: "Київ",
    deliveryMethod: "NOVA_POSHTA_BRANCH" as BuildRequestDeliveryMethod,
    deliveryBranch: "",
    telegramUsername: "",
    promoCode: "",
  };
}

export async function getConfiguratorBuildRequestPrefill() {
  const viewer = await getAuthenticatedUser();

  if (!viewer?.id) {
    return getBuildRequestFormPrefill(null);
  }

  const profile = await db.user.findUnique({
    where: { id: viewer.id },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });

  return getBuildRequestFormPrefill(profile);
}

export async function createBuildRequestForBuild({
  slug,
  payload,
}: {
  slug: string;
  payload: z.infer<typeof buildRequestSchema>;
}) {
  const parsed = buildRequestSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false as const,
      error: firstIssue?.message || "Некоректні дані запиту",
    };
  }

  const resolvedDeliveryCity = resolveUkraineCity(parsed.data.deliveryCity);

  const [viewer, build] = await Promise.all([getAuthenticatedUser(), getBuildRequestRecord(slug)]);

  if (!build) {
    return {
      ok: false as const,
      error: "Збірку не знайдено",
    };
  }

  if (build.items.length === 0) {
    return {
      ok: false as const,
      error: "Збірка порожня",
    };
  }

  const itemsBySlot = Object.fromEntries(
    build.items
      .filter((item) => isConfiguratorSlotKey(item.slot))
      .map((item) => [
        item.slot,
        {
          slot: item.slot,
          quantity: item.quantity,
          product: mapProduct(item.product, parsed.data.locale),
        },
      ]),
  ) as Record<string, unknown>;
  const compatibility = await evaluateBuildCompatibility(
    {
      itemsBySlot: {
        cpu: null,
        motherboard: null,
        ram: null,
        gpu: null,
        storage: null,
        psu: null,
        cooling: null,
        case: null,
        monitor: null,
        keyboard: null,
        mouse: null,
        headset: null,
        accessories: null,
        ...(itemsBySlot as object),
      },
    },
    parsed.data.locale,
  );

  if (compatibility.status === "fail") {
    return {
      ok: false as const,
      error:
        compatibility.errors[0]?.message ||
        getCompatibilityFallbackMessage("build_incompatible", parsed.data.locale),
    };
  }

  const itemsSnapshot = serializeBuildItems(parsed.data.locale, build.items);
  const componentsFromBuild =
    build.totalPrice > 0
      ? build.totalPrice
      : itemsSnapshot.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const siteSettings = await db.siteSettings.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
  });
  const assemblyFeeBefore = computePcAssemblyServiceFeeUah({
    componentsSubtotal: componentsFromBuild,
    hasPcBuild: true,
    ...resolveAssemblyFeeSettings(siteSettings),
  });

  let totalPrice = componentsFromBuild + assemblyFeeBefore;
  let promoCodeId: string | null = null;
  let promoCodeCodeSnapshot: string | null = null;
  let promoDiscountAmount = 0;
  let promoEffectType: PromoCodeType | null = null;

  const rawPromo = (parsed.data.promoCode ?? "").trim();
  if (rawPromo.length > 0) {
    const key = normalizePromoCodeKey(rawPromo);
    const promo = await db.promoCode.findUnique({
      where: {
        codeKey: key,
      },
    });
    const validated = validatePromoRecordWindow(promo, new Date());

    if (!validated.ok) {
      return {
        ok: false as const,
        error: PROMO_ERROR_MESSAGES_UK[validated.code],
      };
    }

    const valueOk = validatePromoValueShape(validated.promo);

    if (!valueOk.ok) {
      return {
        ok: false as const,
        error: PROMO_ERROR_MESSAGES_UK[valueOk.code],
      };
    }

    const effect = computePromoMonetaryEffect({
      promo: validated.promo,
      componentsSubtotal: componentsFromBuild,
      assemblyFeeBefore,
      hasConfiguratorItems: true,
    });

    if (!effect.ok) {
      return {
        ok: false as const,
        error: PROMO_ERROR_MESSAGES_UK[effect.code],
      };
    }

    const freshPromo = await db.promoCode.findUnique({
      where: {
        id: validated.promo.id,
      },
    });

    if (
      !freshPromo ||
      !freshPromo.isActive ||
      (freshPromo.usageLimit !== null && freshPromo.usedCount >= freshPromo.usageLimit)
    ) {
      return {
        ok: false as const,
        error: PROMO_ERROR_MESSAGES_UK.LIMIT_REACHED,
      };
    }

    totalPrice = effect.result.finalTotal;
    promoCodeId = freshPromo.id;
    promoCodeCodeSnapshot = freshPromo.code;
    promoDiscountAmount = effect.result.promoDiscountAmount;
    promoEffectType = freshPromo.type;
  }

  const duplicateThreshold = new Date(Date.now() - 2 * 60 * 1000);
  const duplicateRequest = await db.pcBuildRequest.findFirst({
    where: {
      buildId: build.id,
      phone: parsed.data.phone,
      email: parsed.data.email,
      createdAt: {
        gte: duplicateThreshold,
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (duplicateRequest) {
    return {
      ok: false as const,
      error: "Забагато схожих заявок за короткий час",
    };
  }

  const request = await db.$transaction(async (tx) => {
    const created = await tx.pcBuildRequest.create({
      data: {
        buildId: build.id,
        userId: viewer?.id ?? build.user?.id ?? null,
        locale: parsed.data.locale,
        customerName: parsed.data.fullName,
        contact: parsed.data.phone,
        phone: parsed.data.phone,
        email: parsed.data.email,
        comment: parsed.data.comment?.trim() ? parsed.data.comment.trim() : null,
        status: "NEW",
        deliveryCity: resolvedDeliveryCity,
        deliveryMethod: parsed.data.deliveryMethod,
        deliveryBranch:
          parsed.data.deliveryMethod === "NOVA_POSHTA_BRANCH"
            ? (parsed.data.deliveryBranch ?? "").trim() || null
            : null,
        telegramUsername: normalizeTelegramUsernameInput(parsed.data.telegramUsername ?? ""),
        totalPrice,
        currency: itemsSnapshot[0]?.currency ?? STOREFRONT_CURRENCY_CODE,
        itemsSnapshot: JSON.stringify(itemsSnapshot),
        promoCodeId,
        promoCodeCodeSnapshot,
        promoDiscountAmount,
        promoEffectType,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        build: {
          select: {
            id: true,
            slug: true,
            name: true,
            shareToken: true,
          },
        },
      },
    });

    if (promoCodeId) {
      await tx.promoCode.update({
        where: {
          id: promoCodeId,
        },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    }

    return created;
  });

  await notifyBuildRequestCreated({
    requestId: request.id,
    locale: parsed.data.locale,
    customerName: request.customerName,
    contact: request.contact,
    budget: totalPrice,
    currency: request.currency,
    useCase: request.comment,
    source: "configurator",
    kind: "configurator",
    telegramUsername: request.telegramUsername,
    deliveryBranch: request.deliveryBranch,
    deliveryMethod: request.deliveryMethod,
    promoCodeCodeSnapshot: request.promoCodeCodeSnapshot,
    promoEffectType: request.promoEffectType,
    promoDiscountAmount: request.promoDiscountAmount,
  });

  return {
    ok: true as const,
    request: {
      id: request.id,
      number: `LM-${request.id.slice(-6).toUpperCase()}`,
      status: request.status as BuildRequestStatus,
    },
  };
}

export async function createQuickBuildRequest(payload: z.infer<typeof quickBuildRequestSchema>) {
  const parsed = quickBuildRequestSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false as const,
      error: firstIssue?.message || "Некоректні дані запиту",
    };
  }

  const normalizedFullName = normalizeCustomerName(parsed.data.fullName);
  const normalizedContact = normalizeContactValue(parsed.data.contact);
  const normalizedUseCase = normalizeMultilineText(parsed.data.useCase, 500);
  const normalizedPreferences = normalizeMultilineText(parsed.data.preferences ?? "", 1000);
  const normalizedSource = normalizeMultilineText(parsed.data.source ?? "", 180);

  if (parsed.data.website?.trim()) {
    return {
      ok: false as const,
      error: "Виявлено спам",
    };
  }

  if (!normalizedContact) {
    return {
      ok: false as const,
      error: "Некоректний контакт",
    };
  }

  if (
    [normalizedFullName, normalizedContact, normalizedUseCase, normalizedPreferences, normalizedSource]
      .filter(Boolean)
      .some((value) => containsUnsafeInput(value) || hasExcessiveRepeats(value))
  ) {
    return {
      ok: false as const,
      error: "Запит містить непідтримуваний вміст",
    };
  }

  const budgetMinorUnits = parseBudgetToMinorUnits(parsed.data.budget);

  if (budgetMinorUnits === null) {
    return {
      ok: false as const,
      error: "Некоректний бюджет",
    };
  }

  // Server-side promo validation (structural, not stored in comment)
  let promoCodeId: string | null = null;
  let promoCodeCodeSnapshot: string | null = null;
  let promoEffectType: PromoCodeType | null = null;

  const rawPromoInput = (parsed.data.promoCode ?? "").trim();
  if (rawPromoInput.length >= 2) {
    const key = normalizePromoCodeKey(rawPromoInput);
    const promoRecord = await db.promoCode.findUnique({ where: { codeKey: key } });
    const validated = validatePromoRecordWindow(promoRecord, new Date());

    if (!validated.ok) {
      return { ok: false as const, error: PROMO_ERROR_MESSAGES_UK[validated.code] };
    }

    const valueOk = validatePromoValueShape(validated.promo);
    if (!valueOk.ok) {
      return { ok: false as const, error: PROMO_ERROR_MESSAGES_UK[valueOk.code] };
    }

    // FREE_BUILD requires a full configurator build with assembly fee — not applicable here
    if (validated.promo.type === "FREE_BUILD") {
      return { ok: false as const, error: PROMO_ERROR_MESSAGES_UK.INAPPLICABLE_FREE_BUILD };
    }

    promoCodeId = validated.promo.id;
    promoCodeCodeSnapshot = validated.promo.code;
    promoEffectType = validated.promo.type;
    // usedCount is intentionally NOT incremented for quick inquiries:
    // no actual monetary discount is applied at this stage — the manager applies it manually
  }

  const viewer = await getAuthenticatedUser();
  const duplicateThreshold = new Date(Date.now() - 2 * 60 * 1000);
  const duplicateRequest = await db.pcBuildRequest.findFirst({
    where: {
      contact: normalizedContact,
      customerName: normalizedFullName,
      createdAt: {
        gte: duplicateThreshold,
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (duplicateRequest) {
    return {
      ok: false as const,
      error: "Забагато схожих заявок за короткий час",
    };
  }

  const [siteSettings, shareToken] = await Promise.all([
    db.siteSettings.findFirst({
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        defaultCurrency: true,
      },
    }),
    generateUniqueShareToken(),
  ]);
  const buildName = `Швидка заявка: ${parsed.data.fullName}`;
  const slug = await generateUniqueBuildSlug(
    `${getConfiguratorDefaultName(parsed.data.locale)} ${Date.now()}`,
    parsed.data.locale,
  );
  const notes = [
    normalizedUseCase,
    normalizedPreferences,
    normalizedSource,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await db.$transaction(async (tx) => {
    const build = await tx.pcBuild.create({
      data: {
        name: buildName,
        slug,
        userId: viewer?.id ?? null,
        sessionId: null,
        locale: parsed.data.locale,
        totalPrice: 0,
        notes: notes || null,
        shareToken,
      },
    });

    const request = await tx.pcBuildRequest.create({
      data: {
        buildId: build.id,
        userId: viewer?.id ?? null,
        locale: parsed.data.locale,
        customerName: normalizedFullName,
        contact: normalizedContact,
        budget: budgetMinorUnits,
        useCase: normalizedUseCase,
        preferences: normalizedPreferences || null,
        needsMonitor: parsed.data.needsMonitor,
        needsPeripherals: parsed.data.needsPeripherals,
        needsUpgrade: parsed.data.needsUpgrade,
        comment: normalizedSource || null,
        telegramUsername: normalizeTelegramUsernameInput(parsed.data.telegramUsername ?? ""),
        status: "NEW",
        totalPrice: budgetMinorUnits,
        currency: siteSettings?.defaultCurrency ?? STOREFRONT_CURRENCY_CODE,
        itemsSnapshot: "[]",
        promoCodeId,
        promoCodeCodeSnapshot,
        promoDiscountAmount: 0,
        promoEffectType,
      },
    });

    return { build, request };
  });

  await notifyBuildRequestCreated({
    requestId: result.request.id,
    locale: parsed.data.locale,
    customerName: result.request.customerName,
    contact: result.request.contact,
    budget: result.request.budget,
    currency: result.request.currency,
    useCase: result.request.useCase,
    source: normalizedSource || "quick-inquiry",
    kind: "quick_inquiry",
    telegramUsername: result.request.telegramUsername,
    promoCodeCodeSnapshot: result.request.promoCodeCodeSnapshot,
    promoEffectType: result.request.promoEffectType,
    promoDiscountAmount: null,
  });

  return {
    ok: true as const,
    request: {
      id: result.request.id,
      number: `LM-${result.request.id.slice(-6).toUpperCase()}`,
      status: result.request.status as BuildRequestStatus,
    },
  };
}

export async function getAdminBuildRequests(filters?: {
  status?: BuildRequestStatus | "ALL" | null;
  query?: string | null;
  sort?: string | null;
}) {
  const normalizedQuery = normalizeWhitespace(filters?.query ?? "");
  const normalizedSort = normalizeAdminBuildRequestSort(filters?.sort);
  const orderBy: Prisma.PcBuildRequestOrderByWithRelationInput =
    normalizedSort === "created_asc"
      ? { createdAt: "asc" }
      : normalizedSort === "updated_desc"
        ? { updatedAt: "desc" }
        : normalizedSort === "updated_asc"
          ? { updatedAt: "asc" }
          : { createdAt: "desc" };

  return db.pcBuildRequest.findMany({
    where: {
      ...(filters?.status && filters.status !== "ALL" ? { status: filters.status } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { customerName: { contains: normalizedQuery } },
              { contact: { contains: normalizedQuery } },
              { phone: { contains: normalizedQuery } },
              { email: { contains: normalizedQuery } },
              { useCase: { contains: normalizedQuery } },
              { preferences: { contains: normalizedQuery } },
              { comment: { contains: normalizedQuery } },
              { managerNote: { contains: normalizedQuery } },
              { build: { is: { name: { contains: normalizedQuery } } } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      build: {
        select: {
          id: true,
          slug: true,
          name: true,
          totalPrice: true,
          shareToken: true,
          updatedAt: true,
        },
      },
    },
    orderBy,
  });
}

export async function getAdminBuildRequestById(id: string) {
  return db.pcBuildRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      build: {
        include: {
          items: {
            include: {
              product: {
                include: {
                  translations: true,
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
                  attributes: {
                    include: {
                      attribute: true,
                    },
                  },
                  reviews: {
                    where: {
                      status: "APPROVED",
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                  },
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
        },
      },
    },
  });
}

export async function updateAdminBuildRequestStatus({
  requestId,
  status,
}: {
  requestId: string;
  status: BuildRequestStatus;
}) {
  if (!isBuildRequestStatus(status)) {
    throw new Error("Некоректний статус");
  }

  const request = await db.pcBuildRequest.findUnique({
    where: { id: requestId },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      build: {
        select: {
          id: true,
          slug: true,
          name: true,
          shareToken: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("Заявку не знайдено");
  }

  if (request.status === status) {
    return request;
  }

  const updated = await db.pcBuildRequest.update({
    where: { id: requestId },
    data: { status },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      build: {
        select: {
          id: true,
          slug: true,
          name: true,
          shareToken: true,
        },
      },
    },
  });

  return updated;
}

export async function updateAdminBuildRequestManagerNote({
  requestId,
  managerNote,
}: {
  requestId: string;
  managerNote: string;
}) {
  const normalizedManagerNote = normalizeMultilineText(managerNote, 2000);

  return db.pcBuildRequest.update({
    where: { id: requestId },
    data: {
      managerNote: normalizedManagerNote || null,
    },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      build: {
        select: {
          id: true,
          slug: true,
          name: true,
          shareToken: true,
        },
      },
    },
  });
}

export async function assertAdminApiAccess() {
  const viewer = await getAuthenticatedUser();

  if (!viewer) {
    return null;
  }

  if (!hasRole(viewer.role, USER_ROLES.manager)) {
    return null;
  }

  return viewer;
}
