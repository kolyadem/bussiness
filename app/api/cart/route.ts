import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { reportServerError } from "@/lib/observability/logger";
import {
  addProductToOwnedCart,
  removeOwnedCartItem,
  resolveStorefrontOwner,
  updateOwnedCartItemQuantity,
} from "@/lib/storefront/persistence";
import { isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import { addConfiguratorSlotProductToCart } from "@/lib/storefront/configurator-data";

const createSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  pcBuild: z
    .object({
      slug: z.string().trim().min(1),
      slot: z.string().trim().min(1),
    })
    .optional(),
});

const updateSchema = z.object({
  itemId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99),
});

const removeSchema = z.object({
  itemId: z.string().cuid(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
    }

    const product = await db.product.findFirst({
      where: {
        id: parsed.data.productId,
        status: "PUBLISHED",
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Товар не знайдено" }, { status: 404 });
    }

    const owner = await resolveStorefrontOwner({ ensureSession: true });

    if (parsed.data.pcBuild) {
      if (!isConfiguratorSlotKey(parsed.data.pcBuild.slot)) {
        return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
      }

      try {
        const summary = await addConfiguratorSlotProductToCart({
          slug: parsed.data.pcBuild.slug,
          slot: parsed.data.pcBuild.slot,
          productId: parsed.data.productId,
        });

        if (!summary) {
          return NextResponse.json({ error: "Збірку не знайдено" }, { status: 404 });
        }

        return NextResponse.json({
          ok: true,
          count: summary.count,
          itemCount: summary.itemCount,
          subtotal: summary.subtotal,
        });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Не вдалося додати товар з конфігурації в кошик";

        return NextResponse.json({ error: message }, { status: 409 });
      }
    }

    const result = await addProductToOwnedCart({
      owner,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
    });

    if (!result) {
      return NextResponse.json({ error: "Не вдалося визначити власника кошика" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      count: result.summary.lineCount,
      itemCount: result.summary.itemCount,
      subtotal: result.summary.subtotal,
      itemId: result.itemId,
    });
  } catch (error) {
    await reportServerError(error, {
      area: "cart.route.post",
      message: "Failed to add product to cart",
    });
    return NextResponse.json({ error: "Не вдалося оновити кошик зараз. Спробуйте ще раз." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
    }

    const owner = await resolveStorefrontOwner();
    const result = await updateOwnedCartItemQuantity({
      owner,
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
    });

    if (!result) {
      return NextResponse.json({ error: "Позицію не знайдено" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      count: result.summary.lineCount,
      itemCount: result.summary.itemCount,
      subtotal: result.summary.subtotal,
    });
  } catch (error) {
    await reportServerError(error, {
      area: "cart.route.patch",
      message: "Failed to update cart quantity",
    });
    return NextResponse.json({ error: "Не вдалося оновити кошик зараз. Спробуйте ще раз." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = removeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
    }

    const owner = await resolveStorefrontOwner();
    const result = await removeOwnedCartItem({
      owner,
      itemId: parsed.data.itemId,
    });

    return NextResponse.json({
      ok: true,
      count: result.summary.lineCount,
      itemCount: result.summary.itemCount,
      subtotal: result.summary.subtotal,
    });
  } catch (error) {
    await reportServerError(error, {
      area: "cart.route.delete",
      message: "Failed to remove cart item",
    });
    return NextResponse.json({ error: "Не вдалося оновити кошик зараз. Спробуйте ще раз." }, { status: 500 });
  }
}
