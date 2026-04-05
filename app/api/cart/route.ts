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

const createSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).default(1),
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
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const owner = await resolveStorefrontOwner({ ensureSession: true });
    const result = await addProductToOwnedCart({
      owner,
      productId: parsed.data.productId,
      quantity: parsed.data.quantity,
    });

    if (!result) {
      return NextResponse.json({ error: "Could not resolve cart owner" }, { status: 400 });
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
    return NextResponse.json({ error: "Could not update the cart right now" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const owner = await resolveStorefrontOwner();
    const result = await updateOwnedCartItemQuantity({
      owner,
      itemId: parsed.data.itemId,
      quantity: parsed.data.quantity,
    });

    if (!result) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
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
    return NextResponse.json({ error: "Could not update the cart right now" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = removeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
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
    return NextResponse.json({ error: "Could not update the cart right now" }, { status: 500 });
  }
}
