import { NextResponse } from "next/server";
import { rollbackPriceChangeHistory } from "@/lib/admin/price-updates/rollback";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    await rollbackPriceChangeHistory({
      historyId: id,
      rolledBackByUserId: auth.user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Rollback failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
