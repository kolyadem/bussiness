import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

export async function GET() {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  const runs = await db.priceUpdateRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true,
      status: true,
      createdAt: true,
      appliedAt: true,
      _count: { select: { lines: true } },
    },
  });

  return NextResponse.json({ ok: true, runs });
}
