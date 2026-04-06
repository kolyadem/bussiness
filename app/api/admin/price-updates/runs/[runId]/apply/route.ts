import { NextResponse } from "next/server";
import { applyApprovedPriceLines } from "@/lib/admin/price-updates/apply-run";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

export async function POST(_request: Request, context: { params: Promise<{ runId: string }> }) {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { runId } = await context.params;

  try {
    const result = await applyApprovedPriceLines({
      runId,
      appliedByUserId: auth.user.id,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не вдалося застосувати";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
