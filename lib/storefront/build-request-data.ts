import type { Prisma } from "@prisma/client";
import { z } from "zod";
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
import { mapProduct } from "@/lib/storefront/queries";
import {
  BUILD_REQUEST_DELIVERY_METHODS,
  isBuildRequestStatus,
  resolveUkraineCity,
  type BuildRequestDeliveryMethod,
  type BuildRequestSnapshotItem,
  type BuildRequestStatus,
} from "@/lib/storefront/build-requests";

const MIN_BUILD_REQUEST_BUDGET = 100;
const MAX_BUILD_REQUEST_BUDGET = 500_000;
const ADMIN_BUILD_REQUEST_SORTS = [
  "created_desc",
  "created_asc",
  "updated_desc",
  "updated_asc",
] as const;

export type AdminBuildRequestSort = (typeof ADMIN_BUILD_REQUEST_SORTS)[number];

const buildRequestSchema = z.object({
  locale: z.enum(["uk", "ru", "en"]),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  email: z.string().trim().email(),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
  deliveryCity: z.string().trim().min(2).max(120),
  deliveryMethod: z.enum(BUILD_REQUEST_DELIVERY_METHODS),
});

const quickBuildRequestSchema = z.object({
  locale: z.enum(["uk", "ru", "en"]),
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

async function generateUniqueBuildSlug(name: string, locale: "uk" | "ru" | "en") {
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
  locale: "uk" | "ru" | "en",
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
        brandName: product.brand.name,
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
      error: firstIssue?.message || "Invalid request payload",
    };
  }

  const resolvedDeliveryCity = resolveUkraineCity(parsed.data.deliveryCity);

  const [viewer, build] = await Promise.all([getAuthenticatedUser(), getBuildRequestRecord(slug)]);

  if (!build) {
    return {
      ok: false as const,
      error: "Build not found",
    };
  }

  if (build.items.length === 0) {
    return {
      ok: false as const,
      error: "Build is empty",
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
  const totalPrice =
    build.totalPrice > 0
      ? build.totalPrice
      : itemsSnapshot.reduce((sum, item) => sum + item.price * item.quantity, 0);
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
      error: "Too many duplicate requests",
    };
  }

  const request = await db.pcBuildRequest.create({
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
      totalPrice,
      currency: itemsSnapshot[0]?.currency ?? "USD",
      itemsSnapshot: JSON.stringify(itemsSnapshot),
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
      error: firstIssue?.message || "Invalid request payload",
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
      error: "Spam detected",
    };
  }

  if (!normalizedContact) {
    return {
      ok: false as const,
      error: "Contact is invalid",
    };
  }

  if (
    [normalizedFullName, normalizedContact, normalizedUseCase, normalizedPreferences, normalizedSource]
      .filter(Boolean)
      .some((value) => containsUnsafeInput(value) || hasExcessiveRepeats(value))
  ) {
    return {
      ok: false as const,
      error: "Request contains unsupported content",
    };
  }

  const budgetMinorUnits = parseBudgetToMinorUnits(parsed.data.budget);

  if (budgetMinorUnits === null) {
    return {
      ok: false as const,
      error: "Budget is invalid",
    };
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
      error: "Too many duplicate requests",
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
  const buildName =
    parsed.data.locale === "uk"
      ? `Швидка заявка: ${parsed.data.fullName}`
      : parsed.data.locale === "ru"
        ? `Быстрая заявка: ${parsed.data.fullName}`
        : `Quick inquiry: ${parsed.data.fullName}`;
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
        status: "NEW",
        totalPrice: budgetMinorUnits,
        currency: siteSettings?.defaultCurrency ?? "USD",
        itemsSnapshot: "[]",
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
    throw new Error("Invalid status");
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
    throw new Error("Request not found");
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
