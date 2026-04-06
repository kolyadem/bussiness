import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin";
import { updateAdminOrderManagement } from "@/lib/storefront/order-data";

const updateSchema = z.object({
  status: z.string().trim(),
  managerNote: z.string().trim().max(4000).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminAccess();
  } catch {
    return NextResponse.json({ error: "Потрібна автентифікація" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  try {
    const updated = await updateAdminOrderManagement({
      id,
      status: parsed.data.status,
      managerNote: parsed.data.managerNote,
    });

    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося оновити замовлення" },
      { status: 400 },
    );
  }
}
