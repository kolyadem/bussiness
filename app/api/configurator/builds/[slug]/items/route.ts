import { NextResponse } from "next/server";
import { z } from "zod";
import { assertLocale } from "@/lib/utils";
import { isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import {
  removeConfiguratorSlotItem,
  setConfiguratorSlotItem,
} from "@/lib/storefront/configurator-data";

const createSchema = z.object({
  locale: z.string(),
  slot: z.string(),
  productId: z.string().cuid(),
});

const removeSchema = z.object({
  locale: z.string(),
  slot: z.string(),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/configurator/builds/[slug]/items">,
) {
  const { slug } = await context.params;
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (
    !parsed.success ||
    !assertLocale(parsed.data.locale) ||
    !isConfiguratorSlotKey(parsed.data.slot)
  ) {
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  try {
    const build = await setConfiguratorSlotItem({
      slug,
      slot: parsed.data.slot,
      productId: parsed.data.productId,
      locale: parsed.data.locale,
    });

    if (!build) {
      return NextResponse.json({ error: "Збірку не знайдено" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, build });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не вдалося оновити слот" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/configurator/builds/[slug]/items">,
) {
  const { slug } = await context.params;
  const body = await request.json();
  const parsed = removeSchema.safeParse(body);

  if (
    !parsed.success ||
    !assertLocale(parsed.data.locale) ||
    !isConfiguratorSlotKey(parsed.data.slot)
  ) {
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  const build = await removeConfiguratorSlotItem({
    slug,
    slot: parsed.data.slot,
    locale: parsed.data.locale,
  });

  if (!build) {
    return NextResponse.json({ error: "Збірку не знайдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, build });
}
