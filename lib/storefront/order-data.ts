import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { isPrismaRecoverableBuildTimeError } from "@/lib/prisma-build";
import {
  calculateOrderLineFinancials,
  resolveOrderFinancials,
} from "@/lib/commerce/finance";
import { getCart, mapProduct } from "@/lib/storefront/queries";
import { resolveStorefrontOwner } from "@/lib/storefront/persistence";
import {
  getOrderKindFromItems,
  isOrderDeliveryMethod,
  isOrderStatus,
  normalizeOrderDeliveryCity,
  normalizeOrderStatus,
  ORDER_DELIVERY_METHODS,
  ORDER_STATUSES,
} from "@/lib/storefront/orders";

const checkoutSchema = z.object({
  locale: z.enum(["uk", "ru", "en"]),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  email: z.string().trim().email(),
  comment: z.string().trim().max(1000).optional().or(z.literal("")),
  deliveryCity: z.string().trim().min(2).max(120),
  deliveryMethod: z.enum(ORDER_DELIVERY_METHODS),
  deliveryAddress: z.string().trim().max(200).optional().or(z.literal("")),
  deliveryBranch: z.string().trim().max(120).optional().or(z.literal("")),
}).superRefine((data, context) => {
  if (
    data.deliveryMethod === "NOVA_POSHTA_COURIER" &&
    (data.deliveryAddress ?? "").trim().length < 5
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deliveryAddress"],
      message: "Delivery address is required",
    });
  }

  if (
    data.deliveryMethod === "NOVA_POSHTA_BRANCH" &&
    (data.deliveryBranch ?? "").trim().length < 1
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deliveryBranch"],
      message: "Branch number is required",
    });
  }
});

const adminOrderFiltersSchema = z.object({
  status: z.string().trim().optional(),
  query: z.string().trim().optional(),
});

const adminOrderManagementSchema = z.object({
  status: z.string().trim(),
  managerNote: z.string().trim().max(4000).optional().or(z.literal("")),
});

function getInventoryStatusAfterPurchase(stock: number) {
  if (stock <= 0) {
    return "OUT_OF_STOCK";
  }

  if (stock <= 3) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
}

function normalizeComment(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

class OrderCreationError extends Error {}

function enrichOrderItems<T extends { unitPrice: number; unitCost?: number | null; quantity: number }>(
  items: T[],
) {
  return items.map((item) => ({
    ...item,
    lineTotal: item.unitPrice * item.quantity,
    financials: calculateOrderLineFinancials({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unitCost: item.unitCost ?? null,
    }),
  }));
}

function enrichOrderRecord<
  T extends {
    status: string;
    totalPrice: number;
    totalCost?: number | null;
    grossProfit?: number | null;
    items: Array<{
      configuration?: string | null;
      quantity: number;
      unitPrice: number;
      unitCost?: number | null;
    }>;
  },
>(order: T) {
  const items = enrichOrderItems(order.items);

  return {
    ...order,
    status: normalizeOrderStatus(order.status),
    orderKind: getOrderKindFromItems(order.items),
    items,
    financials: resolveOrderFinancials({
      totalPrice: order.totalPrice,
      totalCost: order.totalCost ?? null,
      grossProfit: order.grossProfit ?? null,
      items,
    }),
  };
}

export function getCheckoutFormPrefill(
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
    deliveryMethod: "NOVA_POSHTA_BRANCH" as const,
    deliveryAddress: "",
    deliveryBranch: "",
  };
}

export async function getCheckoutPrefill() {
  const viewer = await getAuthenticatedUser();

  if (!viewer?.id) {
    return getCheckoutFormPrefill(null);
  }

  try {
    const profile = await db.user.findUnique({
      where: {
        id: viewer.id,
      },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    return getCheckoutFormPrefill(profile);
  } catch (error) {
    if (isPrismaRecoverableBuildTimeError(error)) {
      return getCheckoutFormPrefill(null);
    }
    throw error;
  }
}

export async function getCheckoutPageData(locale: "uk" | "ru" | "en") {
  const [cart, prefill] = await Promise.all([getCart(), getCheckoutPrefill()]);

  return {
    locale,
    cart,
    prefill,
  };
}

export async function createOrderFromCart(payload: z.infer<typeof checkoutSchema>) {
  const parsed = checkoutSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false as const,
      error: firstIssue?.message || "Invalid checkout payload",
    };
  }

  const owner = await resolveStorefrontOwner({ ensureSession: true });
  const ownerWhere = owner.userId
    ? { userId: owner.userId }
    : owner.sessionId
      ? { sessionId: owner.sessionId }
      : null;

  if (!ownerWhere) {
    return {
      ok: false as const,
      error: "Could not resolve cart owner",
    };
  }

  const resolvedDeliveryCity = normalizeOrderDeliveryCity(parsed.data.deliveryCity);
  try {
    const created = await db.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: ownerWhere,
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
      });

      if (!cart || cart.items.length === 0) {
        throw new OrderCreationError("Cart is empty");
      }

      for (const item of cart.items) {
        if (item.product.status !== "PUBLISHED") {
          throw new OrderCreationError("One of the products is no longer available");
        }

        if (item.product.inventoryStatus === "OUT_OF_STOCK") {
          throw new OrderCreationError("One of the products is out of stock");
        }
      }

      const orderItemsInput = cart.items.map((item) => {
        const product = mapProduct(item.product, parsed.data.locale);

        return {
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price,
          unitCost: item.product.purchasePrice ?? null,
          currency: product.currency,
          productName: product.name,
          productSlug: product.slug,
          heroImage: product.heroImage,
          brandName: product.category.name,
          configuration: item.configuration ?? null,
        };
      });
      const totalPrice = orderItemsInput.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      const financials = resolveOrderFinancials({
        totalPrice,
        items: orderItemsInput,
      });
      const currency = cart.items[0]?.product.currency ?? "USD";

      const order = await tx.order.create({
        data: {
          userId: owner.userId,
          customerName: parsed.data.fullName,
          phone: parsed.data.phone,
          email: parsed.data.email,
          comment: normalizeComment(parsed.data.comment),
          deliveryCity: resolvedDeliveryCity,
          deliveryMethod: parsed.data.deliveryMethod,
          deliveryAddress:
            parsed.data.deliveryMethod === "NOVA_POSHTA_COURIER"
              ? normalizeOptionalText(parsed.data.deliveryAddress)
              : null,
          deliveryBranch:
            parsed.data.deliveryMethod === "NOVA_POSHTA_BRANCH"
              ? normalizeOptionalText(parsed.data.deliveryBranch)
              : null,
          status: "NEW",
          totalPrice,
          totalCost: financials.cost,
          grossProfit: financials.grossProfit,
          currency,
          items: {
            create: orderItemsInput,
          },
        },
        include: {
          items: true,
        },
      });

      for (const item of cart.items) {
        if (item.product.inventoryStatus === "PREORDER") {
          continue;
        }

        const reserved = await tx.product.updateMany({
          where: {
            id: item.productId,
            status: "PUBLISHED",
            inventoryStatus: {
              not: "OUT_OF_STOCK",
            },
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (reserved.count === 0) {
          throw new OrderCreationError("Not enough stock for one of the products");
        }

        const updatedProduct = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
          select: {
            stock: true,
          },
        });

        if (!updatedProduct) {
          throw new OrderCreationError("One of the products is no longer available");
        }

        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            inventoryStatus: getInventoryStatusAfterPurchase(updatedProduct.stock),
          },
        });
      }

      await tx.cart.delete({
        where: {
          id: cart.id,
        },
      });

      return order;
    });

    return {
      ok: true as const,
      orderId: created.id,
    };
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return {
        ok: false as const,
        error: error.message,
      };
    }

    throw error;
  }
}

export async function getAccountOrders(locale: "uk" | "ru" | "en", userId: string) {
  const orders = await db.order.findMany({
    where: {
      userId,
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
  });

  return orders.map((order) => {
    const enriched = enrichOrderRecord(order);

    return {
      ...enriched,
      items: enriched.items.map((item) => ({
        ...item,
        localizedName: item.productName,
        href: item.productSlug ? `/product/${item.productSlug}` : null,
        locale,
      })),
    };
  });
}

export async function getAccountOrderById({
  id,
  locale,
}: {
  id: string;
  locale: "uk" | "ru" | "en";
}) {
  const viewer = await getAuthenticatedUser();

  if (!viewer?.id) {
    return null;
  }

  const order = await db.order.findFirst({
    where: {
      id,
      userId: viewer.id,
    },
    include: {
      items: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const enriched = enrichOrderRecord(order);

  return {
    ...enriched,
    items: enriched.items.map((item) => ({
      ...item,
      href: item.productSlug ? `/product/${item.productSlug}` : null,
      locale,
    })),
  };
}

export async function getAdminOrders(filters?: {
  status?: string | null;
  query?: string | null;
}) {
  const parsed = adminOrderFiltersSchema.safeParse(filters ?? {});
  const statusFilter =
    parsed.success && parsed.data.status && ORDER_STATUSES.includes(parsed.data.status as (typeof ORDER_STATUSES)[number])
      ? (parsed.data.status as (typeof ORDER_STATUSES)[number])
      : null;
  const searchQuery = parsed.success ? parsed.data.query?.trim() ?? "" : "";
  const normalizedOrderQuery = searchQuery.replace(/^ord-/i, "");

  const orders = await db.order.findMany({
    where: {
      ...(statusFilter
        ? {
            status:
              statusFilter === "PROCESSING"
                ? {
                    in: ["PROCESSING", "IN_PROGRESS"],
                  }
                : statusFilter,
          }
        : {}),
      ...(searchQuery
        ? {
            OR: [
              { id: { endsWith: normalizedOrderQuery } },
              { customerName: { contains: searchQuery } },
              { phone: { contains: searchQuery } },
              { email: { contains: searchQuery } },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          login: true,
        },
      },
      items: {
        orderBy: {
          id: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders.map((order) => enrichOrderRecord(order));
}

export async function getAdminOrderById(id: string) {
  const order = await db.order.findUnique({
    where: {
      id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          login: true,
        },
      },
      items: {
        orderBy: {
          id: "asc",
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  return enrichOrderRecord(order);
}

export async function updateAdminOrderManagement({
  id,
  status,
  managerNote,
}: {
  id: string;
  status: string;
  managerNote?: string;
}) {
  const viewer = await getAuthenticatedUser();

  if (!viewer || !hasRole(viewer.role, USER_ROLES.manager)) {
    throw new Error("Unauthorized");
  }

  const parsed = adminOrderManagementSchema.safeParse({ status, managerNote });

  if (!parsed.success || !isOrderStatus(parsed.data.status)) {
    throw new Error("Invalid order status");
  }

  const existing = await db.order.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error("Order not found");
  }

  return db.order.update({
    where: {
      id,
    },
    data: {
      status: normalizeOrderStatus(parsed.data.status),
      managerNote: normalizeComment(parsed.data.managerNote),
    },
  });
}

export async function updateAdminOrderStatus(args: {
  id: string;
  status: string;
}) {
  return updateAdminOrderManagement(args);
}

export function parseOrderPayload(payload: unknown) {
  return checkoutSchema.safeParse(payload);
}

export function canUseOrderDeliveryMethod(value: string) {
  return isOrderDeliveryMethod(value);
}
