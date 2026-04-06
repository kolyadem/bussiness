import "server-only";

import { subDays, subMonths, subWeeks } from "date-fns";
import type { AppLocale } from "@/lib/constants";
import { db } from "@/lib/db";
import { canViewAdminFinancials } from "@/lib/admin/permissions";
import { getOrderKindFromItems, normalizeOrderStatus, type OrderStatus } from "@/lib/storefront/orders";
import { storedMinorUnitsToUahKopecks } from "@/lib/utils";

type DashboardOrderRecord = {
  id: string;
  status: string;
  totalPrice: number;
  grossProfit: number | null;
  currency: string;
  createdAt: Date;
  customerName: string;
  deliveryCity: string | null;
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    unitCost: number | null;
    currency: string;
    productName: string;
    productSlug: string | null;
    heroImage: string | null;
    configuration: string | null;
  }>;
};

type TrendPoint = {
  label: string;
  orders: number;
  revenue: number;
  profit: number | null;
};

type ProductPerformance = {
  key: string;
  name: string;
  slug: string | null;
  heroImage: string | null;
  quantity: number;
  revenue: number;
  grossProfit: number | null;
  hasCompleteCostBasis: boolean;
};

function toIntlLocale(_locale: AppLocale) {
  return "uk-UA";
}

function isFinancialOrder(status: string) {
  return normalizeOrderStatus(status) !== "CANCELLED";
}

function sumProfit(orders: DashboardOrderRecord[]) {
  const completeOrders = orders.filter((order) => typeof order.grossProfit === "number");

  return {
    value: completeOrders.reduce(
      (sum, order) =>
        sum + storedMinorUnitsToUahKopecks(order.grossProfit ?? 0, order.currency),
      0,
    ),
    hasCompleteCostBasis: completeOrders.length === orders.length,
  };
}

function buildDailyTrend(orders: DashboardOrderRecord[], locale: AppLocale): TrendPoint[] {
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
  });
  const today = new Date();

  return Array.from({ length: 14 }, (_, index) => {
    const date = subDays(today, 13 - index);
    const bucketKey = date.toISOString().slice(0, 10);
    const bucketOrders = orders.filter((order) => order.createdAt.toISOString().slice(0, 10) === bucketKey);
    const financialOrders = bucketOrders.filter((order) => isFinancialOrder(order.status));
    const profits = sumProfit(financialOrders);

    return {
      label: formatter.format(date),
      orders: bucketOrders.length,
      revenue: financialOrders.reduce(
        (sum, order) => sum + storedMinorUnitsToUahKopecks(order.totalPrice, order.currency),
        0,
      ),
      profit: profits.hasCompleteCostBasis ? profits.value : profits.value,
    };
  });
}

function buildWeeklyTrend(orders: DashboardOrderRecord[], locale: AppLocale): TrendPoint[] {
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
  });
  const today = new Date();

  return Array.from({ length: 8 }, (_, index) => {
    const weekStart = subWeeks(today, 7 - index);
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const bucketOrders = orders.filter((order) => order.createdAt >= start && order.createdAt <= end);
    const financialOrders = bucketOrders.filter((order) => isFinancialOrder(order.status));
    const profits = sumProfit(financialOrders);

    return {
      label: `${formatter.format(start)} - ${formatter.format(end)}`,
      orders: bucketOrders.length,
      revenue: financialOrders.reduce(
        (sum, order) => sum + storedMinorUnitsToUahKopecks(order.totalPrice, order.currency),
        0,
      ),
      profit: profits.value,
    };
  });
}

function buildMonthlyTrend(orders: DashboardOrderRecord[], locale: AppLocale): TrendPoint[] {
  const formatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: "short",
    year: "2-digit",
  });
  const today = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const monthDate = subMonths(today, 5 - index);
    const month = monthDate.getMonth();
    const year = monthDate.getFullYear();
    const bucketOrders = orders.filter(
      (order) => order.createdAt.getMonth() === month && order.createdAt.getFullYear() === year,
    );
    const financialOrders = bucketOrders.filter((order) => isFinancialOrder(order.status));
    const profits = sumProfit(financialOrders);

    return {
      label: formatter.format(monthDate),
      orders: bucketOrders.length,
      revenue: financialOrders.reduce(
        (sum, order) => sum + storedMinorUnitsToUahKopecks(order.totalPrice, order.currency),
        0,
      ),
      profit: profits.value,
    };
  });
}

function buildProductPerformance(orders: DashboardOrderRecord[]) {
  const map = new Map<string, ProductPerformance>();

  for (const order of orders) {
    if (!isFinancialOrder(order.status)) {
      continue;
    }

    for (const item of order.items) {
      const key = item.productSlug ?? item.productName;
      const lineRevenue = storedMinorUnitsToUahKopecks(
        item.unitPrice * item.quantity,
        item.currency,
      );
      const lineCostUah =
        typeof item.unitCost === "number"
          ? storedMinorUnitsToUahKopecks(item.unitCost * item.quantity, item.currency)
          : null;
      const lineProfit = lineCostUah != null ? lineRevenue - lineCostUah : null;
      const current = map.get(key);

      if (current) {
        current.quantity += item.quantity;
        current.revenue += lineRevenue;
        current.grossProfit =
          current.grossProfit !== null && lineProfit !== null ? current.grossProfit + lineProfit : null;
        current.hasCompleteCostBasis = current.hasCompleteCostBasis && lineProfit !== null;
        continue;
      }

      map.set(key, {
        key,
        name: item.productName,
        slug: item.productSlug,
        heroImage: item.heroImage,
        quantity: item.quantity,
        revenue: lineRevenue,
        grossProfit: lineProfit,
        hasCompleteCostBasis: lineProfit !== null,
      });
    }
  }

  return Array.from(map.values());
}

function buildStatusCounts(orders: DashboardOrderRecord[]) {
  const counts = new Map<OrderStatus, number>();

  for (const status of ["NEW", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"] as const) {
    counts.set(status, 0);
  }

  for (const order of orders) {
    const normalized = normalizeOrderStatus(order.status);
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
}

export async function getRoleAwareDashboardData({
  locale,
  viewerRole,
}: {
  locale: AppLocale;
  viewerRole: string | null | undefined;
}) {
  const [orders, inventoryCounts, lowStockProducts, buildRequestsCount] = await Promise.all([
    db.order.findMany({
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
    }) as Promise<DashboardOrderRecord[]>,
    Promise.all([
      db.product.count({
        where: {
          status: "PUBLISHED",
          inventoryStatus: "IN_STOCK",
        },
      }),
      db.product.count({
        where: {
          status: "PUBLISHED",
          OR: [{ inventoryStatus: "LOW_STOCK" }, { inventoryStatus: "OUT_OF_STOCK" }, { stock: { lte: 3 } }],
        },
      }),
    ]),
    db.product.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ inventoryStatus: "LOW_STOCK" }, { inventoryStatus: "OUT_OF_STOCK" }, { stock: { lte: 3 } }],
      },
      select: {
        id: true,
        slug: true,
        heroImage: true,
        stock: true,
        inventoryStatus: true,
        translations: true,
      },
      orderBy: [
        {
          stock: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
      take: 6,
    }),
    db.pcBuildRequest.count(),
  ]);

  const canViewFinancials = canViewAdminFinancials(viewerRole);
  const statusCounts = buildStatusCounts(orders);
  const activeOrders = orders.filter((order) => isFinancialOrder(order.status));
  const totalRevenue = activeOrders.reduce(
    (sum, order) => sum + storedMinorUnitsToUahKopecks(order.totalPrice, order.currency),
    0,
  );
  const totalProfit = sumProfit(activeOrders);
  const productPerformance = buildProductPerformance(orders);
  const inventorySummary = {
    inStock: inventoryCounts[0],
    lowStock: inventoryCounts[1],
  };

  return {
    totals: {
      orders: orders.length,
      newOrders: statusCounts.find((item) => item.status === "NEW")?.count ?? 0,
      buildRequests: buildRequestsCount,
      revenue: canViewFinancials ? totalRevenue : null,
      grossProfit: canViewFinancials ? totalProfit.value : null,
      grossProfitComplete: canViewFinancials ? totalProfit.hasCompleteCostBasis : false,
      averageOrderValue:
        canViewFinancials && activeOrders.length > 0 ? Math.round(totalRevenue / activeOrders.length) : null,
      inStockProducts: inventorySummary.inStock,
      lowStockProducts: inventorySummary.lowStock,
    },
    statusCounts,
    trends: canViewFinancials
      ? {
          day: buildDailyTrend(orders, locale),
          week: buildWeeklyTrend(orders, locale),
          month: buildMonthlyTrend(orders, locale),
        }
      : null,
    topSellingProducts: productPerformance
      .sort((left, right) => right.quantity - left.quantity || right.revenue - left.revenue)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        revenue: canViewFinancials ? item.revenue : 0,
      })),
    topProfitableProducts: canViewFinancials
      ? productPerformance
          .filter((item) => typeof item.grossProfit === "number")
          .sort((left, right) => (right.grossProfit ?? 0) - (left.grossProfit ?? 0))
          .slice(0, 5)
      : null,
    lowStockProducts,
    recentOrders: orders.slice(0, 6).map((order) => ({
      id: order.id,
      customerName: order.customerName,
      deliveryCity: order.deliveryCity,
      createdAt: order.createdAt,
      totalPrice: canViewFinancials ? order.totalPrice : null,
      currency: order.currency,
      status: normalizeOrderStatus(order.status),
      orderKind: getOrderKindFromItems(order.items),
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
  };
}
