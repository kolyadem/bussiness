import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  addProductToOwnedList,
  removeProductFromOwnedList,
  resolveStorefrontOwner,
} from "@/lib/storefront/persistence";

const payloadSchema = z.object({
  productId: z.string().cuid(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

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
  const result = await addProductToOwnedList({
    model: "compareItem",
    owner,
    productId: parsed.data.productId,
  });

  if (!result) {
    return NextResponse.json({ error: "Не вдалося визначити власника списку порівняння" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, count: result.count, created: result.created });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  const owner = await resolveStorefrontOwner();
  const result = await removeProductFromOwnedList({
    model: "compareItem",
    owner,
    productId: parsed.data.productId,
  });

  return NextResponse.json({ ok: true, count: result.count, removed: result.removed });
}
