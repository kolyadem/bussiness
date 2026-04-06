import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePriceUpdatesApiUser } from "@/lib/admin/require-admin-api";

type Body = {
  lines?: Array<{ id: string; userApproved: boolean }>;
};

export async function PATCH(request: Request, context: { params: Promise<{ runId: string }> }) {
  const auth = await requirePriceUpdatesApiUser();
  if ("error" in auth) {
    return auth.error;
  }

  const { runId } = await context.params;

  const run = await db.priceUpdateRun.findUnique({
    where: { id: runId },
    select: { status: true },
  });

  if (!run) {
    return NextResponse.json({ error: "Перевірку не знайдено" }, { status: 404 });
  }
  if (run.status !== "PREVIEW_READY") {
    return NextResponse.json({ error: "Перевірку не можна редагувати" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некоректний JSON" }, { status: 400 });
  }

  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (lines.length === 0) {
    return NextResponse.json({ error: "Немає рядків" }, { status: 400 });
  }

  for (const row of lines) {
    if (!row.id || typeof row.userApproved !== "boolean") {
      continue;
    }
    await db.priceUpdateLine.updateMany({
      where: {
        id: row.id,
        runId,
      },
      data: {
        userApproved: row.userApproved,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
