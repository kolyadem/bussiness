import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

export async function GET(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { runId } = await context.params;

  const run = await db.priceUpdateRun.findUnique({
    where: { id: runId },
    include: {
      lines: {
        orderBy: { skuSnapshot: "asc" },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Не знайдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, run });
}
