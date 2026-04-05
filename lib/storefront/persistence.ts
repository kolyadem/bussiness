import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { ensureSessionId, getSessionId } from "@/lib/session";

export type StorefrontOwner = {
  userId: string | null;
  sessionId: string | null;
  mode: "user" | "session" | "anonymous";
};

function normalizeCartItemConfiguration(configuration?: string | null) {
  const normalized = configuration?.trim() ?? "";
  return {
    configuration: normalized.length > 0 ? normalized : null,
    configurationKey: normalized,
  };
}

function getOwnerMode(userId: string | null, sessionId: string | null): StorefrontOwner["mode"] {
  if (userId) {
    return "user";
  }

  if (sessionId) {
    return "session";
  }

  return "anonymous";
}

export async function resolveStorefrontOwner(options?: { ensureSession?: boolean }) {
  const viewer = await getAuthenticatedUser();
  const sessionId = options?.ensureSession ? await ensureSessionId() : await getSessionId();

  return {
    userId: viewer?.id ?? null,
    sessionId,
    mode: getOwnerMode(viewer?.id ?? null, sessionId),
  } satisfies StorefrontOwner;
}

export function getOwnershipWhere(owner: Pick<StorefrontOwner, "userId" | "sessionId">) {
  if (owner.userId) {
    return { userId: owner.userId };
  }

  if (owner.sessionId) {
    return { sessionId: owner.sessionId };
  }

  return null;
}

export async function getOwnedCart(
  owner: Pick<StorefrontOwner, "userId" | "sessionId">,
  options?: {
    include?: Prisma.CartInclude;
    select?: Prisma.CartSelect;
  },
) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return null;
  }

  return db.cart.findFirst({
    where,
    ...(options?.include ? { include: options.include } : {}),
    ...(options?.select ? { select: options.select } : {}),
  });
}

export async function getOrCreateOwnedCart(owner: StorefrontOwner) {
  if (owner.userId) {
    return db.cart.upsert({
      where: {
        userId: owner.userId,
      },
      update: {},
      create: {
        userId: owner.userId,
      },
    });
  }

  if (owner.sessionId) {
    return db.cart.upsert({
      where: {
        sessionId: owner.sessionId,
      },
      update: {},
      create: {
        sessionId: owner.sessionId,
      },
    });
  }

  return null;
}

export async function getCartSummary(cartId: string) {
  const items = await db.cartItem.findMany({
    where: { cartId },
    include: {
      product: {
        select: {
          price: true,
        },
      },
    },
  });

  return {
    lineCount: items.length,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  };
}

export async function addProductToOwnedCart({
  owner,
  productId,
  quantity,
  configuration,
}: {
  owner: StorefrontOwner;
  productId: string;
  quantity: number;
  configuration?: string | null;
}) {
  const cart = await getOrCreateOwnedCart(owner);

  if (!cart) {
    return null;
  }

  const normalizedConfiguration = normalizeCartItemConfiguration(configuration);
  const item = await db.cartItem.upsert({
    where: {
      cartId_productId_configurationKey: {
        cartId: cart.id,
        productId,
        configurationKey: normalizedConfiguration.configurationKey,
      },
    },
    update: {
      quantity: {
        increment: quantity,
      },
    },
    create: {
      cartId: cart.id,
      productId,
      quantity,
      configuration: normalizedConfiguration.configuration,
      configurationKey: normalizedConfiguration.configurationKey,
    },
    select: {
      id: true,
    },
  });

  const summary = await getCartSummary(cart.id);

  return {
    cartId: cart.id,
    itemId: item.id,
    summary,
  };
}

export async function updateOwnedCartItemQuantity({
  owner,
  itemId,
  quantity,
}: {
  owner: StorefrontOwner;
  itemId: string;
  quantity: number;
}) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return {
      updated: false,
      summary: { lineCount: 0, itemCount: 0, subtotal: 0 },
    };
  }

  const result = await db.cartItem.updateMany({
    where: {
      id: itemId,
      cart: where,
    },
    data: {
      quantity,
    },
  });

  if (result.count === 0) {
    return null;
  }

  const cart = await getOwnedCart(owner, {
    select: {
      id: true,
    },
  });

  if (!cart) {
    return {
      updated: true,
      summary: { lineCount: 0, itemCount: 0, subtotal: 0 },
    };
  }

  return {
    updated: true,
    summary: await getCartSummary(cart.id),
  };
}

export async function removeOwnedCartItem({
  owner,
  itemId,
}: {
  owner: StorefrontOwner;
  itemId: string;
}) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return {
      removed: false,
      summary: { lineCount: 0, itemCount: 0, subtotal: 0 },
    };
  }

  const result = await db.cartItem.deleteMany({
    where: {
      id: itemId,
      cart: where,
    },
  });

  const cart = await getOwnedCart(owner, {
    select: {
      id: true,
    },
  });

  if (!cart) {
    return {
      removed: result.count > 0,
      summary: { lineCount: 0, itemCount: 0, subtotal: 0 },
    };
  }

  return {
    removed: result.count > 0,
    summary: await getCartSummary(cart.id),
  };
}

export async function mergeSessionCartIntoUserCart({
  userId,
  sessionId,
}: {
  userId: string;
  sessionId: string | null;
}) {
  if (!sessionId) {
    return getOwnedCart({ userId, sessionId: null }, { select: { id: true } });
  }

  return db.$transaction(async (tx) => {
    const sessionCart = await tx.cart.findFirst({
      where: {
        sessionId,
      },
      include: {
        items: true,
      },
    });

    let userCart = await tx.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!sessionCart) {
      return userCart;
    }

    if (!userCart) {
      userCart = await tx.cart.create({
        data: {
          userId,
        },
        include: {
          items: true,
        },
      });
    }

    for (const sessionItem of sessionCart.items) {
      const normalizedConfiguration = normalizeCartItemConfiguration(sessionItem.configuration);

      await tx.cartItem.upsert({
        where: {
          cartId_productId_configurationKey: {
            cartId: userCart.id,
            productId: sessionItem.productId,
            configurationKey: normalizedConfiguration.configurationKey,
          },
        },
        update: {
          quantity: {
            increment: sessionItem.quantity,
          },
        },
        create: {
          cartId: userCart.id,
          productId: sessionItem.productId,
          quantity: sessionItem.quantity,
          configuration: normalizedConfiguration.configuration,
          configurationKey: normalizedConfiguration.configurationKey,
        },
      });
    }

    await tx.cart.delete({
      where: {
        id: sessionCart.id,
      },
    });

    return tx.cart.findFirst({
      where: {
        userId,
      },
      include: {
        items: true,
      },
    });
  });
}

export async function addProductToOwnedList({
  model,
  owner,
  productId,
}: {
  model: "wishlistItem" | "compareItem";
  owner: StorefrontOwner;
  productId: string;
}) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return null;
  }

  const existing =
    model === "wishlistItem"
      ? await db.wishlistItem.findFirst({
          where: {
            ...where,
            productId,
          },
        })
      : await db.compareItem.findFirst({
          where: {
            ...where,
            productId,
          },
        });

  let created = false;

  if (!existing) {
    if (model === "wishlistItem") {
      await db.wishlistItem.create({
        data: owner.userId
          ? { userId: owner.userId, productId }
          : { sessionId: owner.sessionId!, productId },
      });
    } else {
      await db.compareItem.create({
        data: owner.userId
          ? { userId: owner.userId, productId }
          : { sessionId: owner.sessionId!, productId },
      });
    }
    created = true;
  }

  const count =
    model === "wishlistItem"
      ? await db.wishlistItem.count({
          where,
        })
      : await db.compareItem.count({
          where,
        });

  return { count, created };
}

export async function removeProductFromOwnedList({
  model,
  owner,
  productId,
}: {
  model: "wishlistItem" | "compareItem";
  owner: StorefrontOwner;
  productId: string;
}) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return { count: 0, removed: false };
  }

  const result =
    model === "wishlistItem"
      ? await db.wishlistItem.deleteMany({
          where: {
            ...where,
            productId,
          },
        })
      : await db.compareItem.deleteMany({
          where: {
            ...where,
            productId,
          },
        });

  const count =
    model === "wishlistItem"
      ? await db.wishlistItem.count({
          where,
        })
      : await db.compareItem.count({
          where,
        });

  return { count, removed: result.count > 0 };
}

export async function getOwnedListItems({
  model,
  owner,
  orderBy,
}: {
  model: "wishlistItem" | "compareItem";
  owner: Pick<StorefrontOwner, "userId" | "sessionId">;
  orderBy: { createdAt: "asc" | "desc" };
}) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return [];
  }

  const include = {
    product: {
      include: {
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
        reviews: {
          where: {
            status: "APPROVED",
          },
          orderBy: {
            createdAt: "desc" as const,
          },
        },
      },
    },
  } as const;

  return model === "wishlistItem"
    ? db.wishlistItem.findMany({
        where,
        include,
        orderBy,
      })
    : db.compareItem.findMany({
        where,
        include,
        orderBy,
      });
}

export async function mergeSessionListIntoUserList({
  model,
  userId,
  sessionId,
}: {
  model: "wishlistItem" | "compareItem";
  userId: string;
  sessionId: string | null;
}) {
  if (!sessionId) {
    return;
  }

  await db.$transaction(async (tx) => {
    const sessionItems =
      model === "wishlistItem"
        ? await tx.wishlistItem.findMany({
            where: {
              sessionId,
            },
          })
        : await tx.compareItem.findMany({
            where: {
              sessionId,
            },
          });

    if (sessionItems.length === 0) {
      return;
    }

    for (const sessionItem of sessionItems) {
      const existing =
        model === "wishlistItem"
          ? await tx.wishlistItem.findFirst({
              where: {
                userId,
                productId: sessionItem.productId,
              },
            })
          : await tx.compareItem.findFirst({
              where: {
                userId,
                productId: sessionItem.productId,
              },
            });

      if (!existing) {
        if (model === "wishlistItem") {
          await tx.wishlistItem.create({
            data: {
              userId,
              productId: sessionItem.productId,
            },
          });
        } else {
          await tx.compareItem.create({
            data: {
              userId,
              productId: sessionItem.productId,
            },
          });
        }
      }
    }

    if (model === "wishlistItem") {
      await tx.wishlistItem.deleteMany({
        where: {
          sessionId,
        },
      });
    } else {
      await tx.compareItem.deleteMany({
        where: {
          sessionId,
        },
      });
    }
  });
}

export async function mergeStorefrontStateIntoUser(options: {
  userId: string;
  sessionId: string | null;
}) {
  await mergeSessionCartIntoUserCart(options);
  await mergeSessionListIntoUserList({
    model: "wishlistItem",
    ...options,
  });
  await mergeSessionListIntoUserList({
    model: "compareItem",
    ...options,
  });
}
