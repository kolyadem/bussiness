import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertAdminApiAccess,
  updateAdminBuildRequestManagerNote,
} from "@/lib/storefront/build-request-data";

const updateSchema = z.object({
  managerNote: z.string(),
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/build-requests/[id]/note">,
) {
  const viewer = await assertAdminApiAccess();

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const updated = await updateAdminBuildRequestManagerNote({
      requestId: id,
      managerNote: parsed.data.managerNote,
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update note" },
      { status: 400 },
    );
  }
}
