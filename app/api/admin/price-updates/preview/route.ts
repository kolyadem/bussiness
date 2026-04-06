import { NextResponse } from "next/server";
import { createPricePreviewRun } from "@/lib/admin/price-updates/preview-run";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

export async function POST(request: Request) {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  let body: { importSourceKey?: string | null; limit?: number } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const importSourceKey =
    typeof body.importSourceKey === "string" && body.importSourceKey.trim().length > 0
      ? body.importSourceKey.trim()
      : null;
  const limit = typeof body.limit === "number" && Number.isFinite(body.limit) ? Math.trunc(body.limit) : 50;

  try {
    const result = await createPricePreviewRun({
      createdByUserId: auth.user.id,
      importSourceKey,
      limit,
    });

    return NextResponse.json({
      ok: true,
      runId: result.runId,
      lineCount: result.lineCount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Не вдалося виконати перевірку";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
