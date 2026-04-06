import { db } from "@/lib/db";

/** Internal catalog brand when product brands are not exposed in admin/storefront. */
export const DEFAULT_BRAND_SLUG = "store";

export async function getDefaultBrandId(): Promise<string> {
  const existing = await db.brand.findUnique({
    where: { slug: DEFAULT_BRAND_SLUG },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await db.brand.create({
    data: {
      slug: DEFAULT_BRAND_SLUG,
      sortOrder: 0,
      translations: {
        create: [{ locale: "uk", name: "Каталог" }],
      },
    },
    select: { id: true },
  });

  return created.id;
}
