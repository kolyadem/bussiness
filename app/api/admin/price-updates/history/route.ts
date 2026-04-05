import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

export async function GET() {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  const items = await db.priceChangeHistory.findMany({
    where: { rolledBackAt: null },
    orderBy: { appliedAt: "desc" },
    take: 50,
    include: {
      product: {
        select: { id: true, sku: true },
      },
    },
  });

  return NextResponse.json({ ok: true, items });
}
