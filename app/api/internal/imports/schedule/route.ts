import { NextResponse } from "next/server";
import { runScheduledImportSources } from "@/lib/admin/imports/scheduler";

function readProvidedSchedulerSecret(request: Request) {
  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-import-scheduler-secret");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return headerSecret?.trim() ?? null;
}

export async function POST(request: Request) {
  const configuredSecret = process.env.IMPORT_SCHEDULER_SECRET?.trim() ?? "";

  if (!configuredSecret) {
    return NextResponse.json(
      {
        error: "Змінна IMPORT_SCHEDULER_SECRET не налаштована",
      },
      { status: 503 },
    );
  }

  const providedSecret = readProvidedSchedulerSecret(request);

  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Потрібна автентифікація" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { limit?: number } | null;
  const limit =
    typeof body?.limit === "number" && Number.isFinite(body.limit) && body.limit > 0
      ? Math.trunc(body.limit)
      : 10;
  const result = await runScheduledImportSources({
    limit,
  });

  return NextResponse.json(result);
}
