import { NextResponse } from "next/server";
import { z } from "zod";
import { assertLocale } from "@/lib/utils";
import { updateConfiguratorBuildName } from "@/lib/storefront/configurator-data";

const updateSchema = z.object({
  locale: z.string(),
  name: z.string().trim().max(120),
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/configurator/builds/[slug]">,
) {
  const { slug } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success || !assertLocale(parsed.data.locale)) {
    return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
  }

  const build = await updateConfiguratorBuildName({
    slug,
    locale: parsed.data.locale,
    name: parsed.data.name,
  });

  if (!build) {
    return NextResponse.json({ error: "Збірку не знайдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, build });
}
