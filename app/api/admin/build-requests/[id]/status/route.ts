import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertAdminApiAccess,
  updateAdminBuildRequestStatus,
} from "@/lib/storefront/build-request-data";
import { isBuildRequestStatus } from "@/lib/storefront/build-requests";

const updateSchema = z.object({
  status: z.string(),
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/build-requests/[id]/status">,
) {
  const viewer = await assertAdminApiAccess();

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success || !isBuildRequestStatus(parsed.data.status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const updated = await updateAdminBuildRequestStatus({
      requestId: id,
      status: parsed.data.status,
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update request" },
      { status: 400 },
    );
  }
}
