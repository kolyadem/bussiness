import { notFound } from "next/navigation";
import { AdminProductForm } from "@/components/admin/admin-product-form";
import {
  canViewAdminFinancials,
  getAdminLocaleFields,
  getAdminProductById,
  getAdminProductOptions,
  getAdminSpecs,
  getAdminTechnicalAttributeFields,
  requireAdminAccess,
} from "@/lib/admin";
import { parseJson, storedMinorUnitsToDisplayPrice } from "@/lib/utils";

export default async function EditAdminProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const viewer = await requireAdminAccess(locale);
  const canViewFinancials = canViewAdminFinancials(viewer.role);
  const [product, options] = await Promise.all([
    getAdminProductById(id, viewer.role),
    getAdminProductOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {locale === "uk" ? "Редагування товару" : locale === "ru" ? "Редактирование товара" : "Edit product"}
        </h2>
      </section>
      <AdminProductForm
        locale={locale}
        canViewFinancials={canViewFinancials}
        brands={options.brands}
        categories={options.categories}
        initialValues={{
          productId: product.id,
          slug: product.slug,
          sku: product.sku,
          categoryId: product.categoryId,
          brandId: product.brandId,
          status: product.status,
          price: storedMinorUnitsToDisplayPrice(product.price, product.currency),
          purchasePrice:
            canViewFinancials && typeof product.purchasePrice === "number"
              ? storedMinorUnitsToDisplayPrice(product.purchasePrice, product.currency)
              : null,
          oldPrice:
            typeof product.oldPrice === "number"
              ? storedMinorUnitsToDisplayPrice(product.oldPrice, product.currency)
              : null,
          currency: product.currency,
          inventoryStatus: product.inventoryStatus,
          stock: product.stock,
          heroImage: product.heroImage,
          gallery: parseJson<string[]>(product.gallery, [product.heroImage]),
          metadata: product.metadata,
          translations: getAdminLocaleFields(product),
          specs: getAdminSpecs(product),
          technicalAttributes: getAdminTechnicalAttributeFields(product),
        }}
      />
    </div>
  );
}
