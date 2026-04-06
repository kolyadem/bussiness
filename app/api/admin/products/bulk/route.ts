import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthenticatedUser, hasRole, USER_ROLES } from "@/lib/auth";
import { safeDeleteUploadedProductAsset } from "@/lib/admin/product-assets";
import { displayPriceToStoredMinorUnits, parseJson, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

const bulkSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  action: z.enum([
    "PUBLISH",
    "UNPUBLISH",
    "MOVE_TO_DRAFT",
    "ASSIGN_CATEGORY",
    "DELETE",
    "SET_PRICE",
    "SET_STOCK",
    "ADJUST_STOCK",
    "ADJUST_PRICE_PERCENT",
  ]),
  categoryId: z.string().trim().optional(),
  price: z.coerce.number().finite().optional(),
  stock: z.coerce.number().int().optional(),
  delta: z.coerce.number().finite().optional(),
});

function jsonAuthError(status: 401 | 403) {
  return NextResponse.json(
    {
      error: status === 401 ? "Потрібна автентифікація" : "Недостатньо прав",
    },
    { status },
  );
}

async function requireAdminApiUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { error: jsonAuthError(401) } as const;
  }

  if (!hasRole(user.role, USER_ROLES.manager)) {
    return { error: jsonAuthError(403) } as const;
  }

  return { user } as const;
}

export async function POST(request: Request) {
  const auth = await requireAdminApiUser();

  if ("error" in auth) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  const { productIds, action } = parsed.data;

  if (action === "ASSIGN_CATEGORY" && !parsed.data.categoryId) {
    return NextResponse.json({ error: "Потрібен categoryId" }, { status: 400 });
  }

  if (action === "SET_PRICE" && typeof parsed.data.price !== "number") {
    return NextResponse.json({ error: "Потрібна ціна" }, { status: 400 });
  }

  if (action === "SET_STOCK" && typeof parsed.data.stock !== "number") {
    return NextResponse.json({ error: "Потрібна кількість на складі" }, { status: 400 });
  }

  if (
    (action === "ADJUST_STOCK" || action === "ADJUST_PRICE_PERCENT") &&
    typeof parsed.data.delta !== "number"
  ) {
    return NextResponse.json({ error: "Потрібна зміна (delta)" }, { status: 400 });
  }

  if (action === "DELETE") {
    const products = await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        heroImage: true,
        gallery: true,
      },
    });

    let deletedCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        await db.product.delete({
          where: {
            id: product.id,
          },
        });
        deletedCount += 1;

        const gallery = parseJson<string[]>(product.gallery, []);
        await Promise.all(
          Array.from(new Set([product.heroImage, ...gallery])).map((assetPath) =>
            safeDeleteUploadedProductAsset(assetPath),
          ),
        );
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Не вдалося видалити ${product.id}`);
      }
    }

    return NextResponse.json({
      ok: true,
      processedCount: deletedCount,
      failedCount: errors.length,
      errors,
    });
  }

  if (action === "PUBLISH" || action === "UNPUBLISH" || action === "MOVE_TO_DRAFT") {
    const status =
      action === "PUBLISH" ? "PUBLISHED" : action === "UNPUBLISH" ? "ARCHIVED" : "DRAFT";

    const result = await db.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: {
        status,
      },
    });

    return NextResponse.json({ ok: true, processedCount: result.count });
  }

  if (action === "ASSIGN_CATEGORY") {
    const category = await db.category.findUnique({
      where: {
        id: parsed.data.categoryId!,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Категорію не знайдено" }, { status: 404 });
    }

    const result = await db.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: {
        categoryId: parsed.data.categoryId!,
      },
    });

    return NextResponse.json({ ok: true, processedCount: result.count });
  }

  if (action === "SET_PRICE") {
    const result = await db.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: {
        price: displayPriceToStoredMinorUnits(parsed.data.price!, STOREFRONT_CURRENCY_CODE),
      },
    });

    return NextResponse.json({ ok: true, processedCount: result.count });
  }

  if (action === "SET_STOCK") {
    const stock = Math.max(0, Math.trunc(parsed.data.stock!));
    const result = await db.product.updateMany({
      where: {
        id: {
          in: productIds,
        },
      },
      data: {
        stock,
        inventoryStatus: stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      },
    });

    return NextResponse.json({ ok: true, processedCount: result.count });
  }

  if (action === "ADJUST_STOCK") {
    const products = await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        stock: true,
      },
    });

    await Promise.all(
      products.map((product) => {
        const nextStock = Math.max(0, product.stock + Math.trunc(parsed.data.delta!));
        return db.product.update({
          where: {
            id: product.id,
          },
          data: {
            stock: nextStock,
            inventoryStatus: nextStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
          },
        });
      }),
    );

    return NextResponse.json({ ok: true, processedCount: products.length });
  }

  if (action === "ADJUST_PRICE_PERCENT") {
    const products = await db.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        price: true,
      },
    });

    await Promise.all(
      products.map((product) => {
        const nextPrice = Math.max(
          0,
          Math.round(product.price * (1 + parsed.data.delta! / 100)),
        );

        return db.product.update({
          where: {
            id: product.id,
          },
          data: {
            price: nextPrice,
          },
        });
      }),
    );

    return NextResponse.json({ ok: true, processedCount: products.length });
  }

  return NextResponse.json({ error: "Непідтримувана масова дія" }, { status: 400 });
}
