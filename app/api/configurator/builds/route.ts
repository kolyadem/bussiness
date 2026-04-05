import { NextResponse } from "next/server";
import { z } from "zod";
import { assertLocale } from "@/lib/utils";
import { createConfiguratorBuild } from "@/lib/storefront/configurator-data";

const createSchema = z.object({
  locale: z.string(),
  name: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success || !assertLocale(parsed.data.locale)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const build = await createConfiguratorBuild({
    locale: parsed.data.locale,
    name: parsed.data.name,
  });

  return NextResponse.json({ ok: true, build });
}
