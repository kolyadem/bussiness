import type { PromoCodeType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  USER_ROLES,
  requireAdminUser,
  requireManagerUser,
} from "@/lib/auth";
import {
  canViewAdminFinancials,
} from "@/lib/admin/permissions";

export * from "@/lib/admin/permissions";
import { defaultLocale, locales, type AppLocale } from "@/lib/constants";
import { getTechnicalAttributeInputMap } from "@/lib/configurator/technical-attributes";
import {
  getAdminBuildRequestById as getBuildRequestById,
  getAdminBuildRequests as getBuildRequests,
} from "@/lib/storefront/build-request-data";
import {
  getAdminOrderById as getOrderById,
  getAdminOrders as getOrders,
} from "@/lib/storefront/order-data";
import {
  getImportJobById,
  getImportJobHistory,
  getImportSourceConfigs,
} from "@/lib/admin/imports/persistence";
import { getImportAlerts, scanImportHealthAlerts, type ImportAlertStatus } from "@/lib/admin/imports/alerts";
import { getDashboardImportHealth } from "@/lib/admin/imports/health";
import { getRoleAwareDashboardData } from "@/lib/admin/dashboard";
import { parseJson } from "@/lib/utils";

export async function requireAdminAccess(locale?: string | null) {
  return requireManagerUser(locale);
}

export async function requireAdminOnlyAccess(locale?: string | null) {
  return requireAdminUser(locale);
}

function stripProductFinancials<T extends { purchasePrice: number | null }>(
  product: T,
  viewerRole: string | null | undefined,
) {
  if (canViewAdminFinancials(viewerRole)) {
    return product;
  }

  return {
    ...product,
    purchasePrice: null,
  };
}

function stripOrderFinancials<
  T extends {
    financials: {
      revenue: number;
      cost: number | null;
      grossProfit: number | null;
      marginPercent: number | null;
      hasCompleteCostBasis: boolean;
    };
    items: Array<{
      unitCost?: number | null;
      financials?: {
        revenue: number;
        cost: number | null;
        grossProfit: number | null;
      };
    }>;
  },
>(order: T, viewerRole: string | null | undefined) {
  if (canViewAdminFinancials(viewerRole)) {
    return order;
  }

  return {
    ...order,
    financials: {
      ...order.financials,
      cost: null,
      grossProfit: null,
      marginPercent: null,
      hasCompleteCostBasis: false,
    },
    items: order.items.map((item) => ({
      ...item,
      unitCost: null,
      financials: item.financials
        ? {
            ...item.financials,
            cost: null,
            grossProfit: null,
          }
        : item.financials,
    })),
  };
}

export async function getAdminDashboardData({
  locale,
  viewerRole,
}: {
  locale: AppLocale;
  viewerRole: string | null | undefined;
}) {
  const [baseCounts, dashboard] = await Promise.all([
    Promise.all([
      db.product.count(),
      db.product.count({
        where: {
          status: "PUBLISHED",
        },
      }),
      db.product.count({
        where: {
          status: "DRAFT",
        },
      }),
      db.category.count(),
      db.importJob.count(),
    ]),
    getRoleAwareDashboardData({ locale, viewerRole }),
  ]);

  const [productsCount, publishedCount, draftCount, categoriesCount, importsCount] = baseCounts;

  return {
    productsCount,
    publishedCount,
    draftCount,
    categoriesCount,
    importsCount,
    ...dashboard,
  };
}

export async function getAdminDashboardImportHealth() {
  await scanImportHealthAlerts();
  return getDashboardImportHealth();
}

export async function getAdminBuildRequests(filters?: {
  status?: "ALL" | "NEW" | "IN_REVIEW" | "COMPLETED" | "REJECTED" | null;
  query?: string | null;
  sort?: string | null;
}) {
  return getBuildRequests(filters);
}

export async function getAdminBuildRequestById(id: string) {
  return getBuildRequestById(id);
}

export async function getAdminOrders(filters?: {
  status?: string | null;
  query?: string | null;
}, viewerRole?: string | null) {
  const orders = await getOrders(filters);
  return orders.map((order) => stripOrderFinancials(order, viewerRole));
}

export async function getAdminOrderById(id: string, viewerRole?: string | null) {
  const order = await getOrderById(id);
  return order ? stripOrderFinancials(order, viewerRole) : null;
}

export async function getAdminImportJobs(limit?: number) {
  return getImportJobHistory(limit);
}

export async function getAdminImportJobById(id: string) {
  return getImportJobById(id);
}

export async function getAdminImportSourceConfigs() {
  return getImportSourceConfigs();
}

export async function getAdminImportAlerts(status?: ImportAlertStatus | "ALL") {
  await scanImportHealthAlerts();
  return getImportAlerts({
    status: status ?? "ALL",
  });
}

export async function getAdminSiteSettings() {
  return db.siteSettings.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getAdminProducts(viewerRole?: string | null) {
  const products = await db.product.findMany({
    include: {
      translations: true,
      attributes: {
        include: {
          attribute: true,
        },
      },
      category: {
        include: {
          translations: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return products.map((product) => stripProductFinancials(product, viewerRole));
}

export async function getAdminProductOptions() {
  const categories = await db.category.findMany({
    include: {
      translations: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  return {
    categories,
  };
}

export async function getAdminCategories() {
  return db.category.findMany({
    include: {
      translations: true,
      parent: {
        include: {
          translations: true,
        },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
}

export async function getAdminCategoryById(id: string) {
  return db.category.findUnique({
    where: {
      id,
    },
    include: {
      translations: true,
      parent: {
        include: {
          translations: true,
        },
      },
      children: {
        include: {
          translations: true,
        },
      },
      _count: {
        select: {
          products: true,
          children: true,
        },
      },
    },
  });
}

export async function getAdminBanners() {
  return db.banner.findMany({
    include: {
      translations: true,
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        key: "asc",
      },
    ],
  });
}

export async function getAdminBannerById(id: string) {
  return db.banner.findUnique({
    where: {
      id,
    },
    include: {
      translations: true,
    },
  });
}

export async function getAdminProductById(id: string, viewerRole?: string | null) {
  const product = await db.product.findUnique({
    where: {
      id,
    },
    include: {
      translations: true,
      attributes: {
        include: {
          attribute: true,
        },
      },
      category: {
        include: {
          translations: true,
        },
      },
      reviews: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return product ? stripProductFinancials(product, viewerRole) : null;
}

export async function getAdminUsers() {
  return db.user.findMany({
    select: {
      id: true,
      login: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          orders: true,
        },
      },
    },
    orderBy: [
      {
        role: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
}

export async function countAdminUsers() {
  return db.user.count({
    where: {
      role: USER_ROLES.admin,
    },
  });
}

export async function getAdminAccountData(userId: string) {
  return db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      login: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      image: true,
    },
  });
}

export function pickAdminTranslation<
  T extends {
    locale: string;
  },
>(translations: T[], locale: string) {
  return (
    translations.find((item) => item.locale === locale) ??
    translations.find((item) => item.locale === defaultLocale) ??
    translations[0]
  );
}

export function getAdminLocaleFields(product: {
  translations: Array<{
    locale: string;
    name: string;
    shortDescription: string;
    description: string;
    seoTitle: string | null;
    seoDescription: string | null;
  }>;
}) {
  const translation =
    product.translations.find((item) => item.locale === defaultLocale) ??
    product.translations[0] ??
    null;

  return {
    name: translation?.name ?? "",
    shortDescription: translation?.shortDescription ?? "",
    description: translation?.description ?? "",
    seoTitle: translation?.seoTitle ?? "",
    seoDescription: translation?.seoDescription ?? "",
  };
}

export function getAdminCategoryLocaleFields(category: {
  translations: Array<{
    locale: string;
    name: string;
    description: string | null;
  }>;
}) {
  const translation =
    category.translations.find((item) => item.locale === defaultLocale) ??
    category.translations[0] ??
    null;

  return {
    name: translation?.name ?? "",
    description: translation?.description ?? "",
  };
}

export function getAdminBannerLocaleFields(banner: {
  translations: Array<{
    locale: string;
    title: string;
    subtitle: string | null;
    ctaLabel: string | null;
  }>;
}) {
  const translation =
    banner.translations.find((item) => item.locale === defaultLocale) ??
    banner.translations[0] ??
    null;

  return {
    title: translation?.title ?? "",
    subtitle: translation?.subtitle ?? "",
    ctaLabel: translation?.ctaLabel ?? "",
  };
}

export function getAdminSpecs(product: { specs: string }) {
  const specs = parseJson<Record<string, string | number | boolean>>(product.specs, {});

  return Object.entries(specs).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

export function getAdminTechnicalAttributeFields(product: {
  category: {
    slug: string;
  };
  attributes: Array<{
    attribute: {
      code: string;
    };
    value: string;
  }>;
  wattage: number | null;
  tdp: number | null;
  lengthMm: number | null;
  maxGpuLengthMm: number | null;
  coolerHeightMm: number | null;
  maxCoolerMm: number | null;
  memoryType: string | null;
  socket: string | null;
  formFactor: string | null;
  supportedSockets: string | null;
  memoryCapacityGb: number | null;
  memorySpeedMhz: number | null;
  storageInterface: string | null;
}) {
  return getTechnicalAttributeInputMap(product);
}

export async function getAdminPromoCodes(filters?: {
  active?: "all" | "active" | "inactive";
  type?: PromoCodeType | "ALL";
}) {
  const active = filters?.active ?? "all";
  const typeFilter = filters?.type ?? "ALL";

  return db.promoCode.findMany({
    where: {
      ...(active === "active" ? { isActive: true } : {}),
      ...(active === "inactive" ? { isActive: false } : {}),
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getAdminPromoCodeById(id: string) {
  return db.promoCode.findUnique({
    where: {
      id,
    },
  });
}

export async function getPromoCodeUsage(promoId: string, limit = 20) {
  const [orders, buildRequests] = await Promise.all([
    db.order.findMany({
      where: { promoCodeId: promoId },
      select: {
        id: true,
        customerName: true,
        phone: true,
        totalPrice: true,
        currency: true,
        promoDiscountAmount: true,
        promoEffectType: true,
        promoCodeCodeSnapshot: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    db.pcBuildRequest.findMany({
      where: { promoCodeId: promoId },
      select: {
        id: true,
        customerName: true,
        contact: true,
        totalPrice: true,
        currency: true,
        promoDiscountAmount: true,
        promoEffectType: true,
        promoCodeCodeSnapshot: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return { orders, buildRequests };
}
