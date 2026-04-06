import { AdminProductCatalogTable } from "@/components/admin/admin-product-catalog-table";
import {
  canViewAdminFinancials,
  getAdminProductOptions,
  getAdminProducts,
  pickAdminTranslation,
  requireAdminAccess,
} from "@/lib/admin";
import { calculateUnitFinancials } from "@/lib/commerce/finance";

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en" }>;
}) {
  const { locale } = await params;
  const viewer = await requireAdminAccess(locale);
  const canViewFinancials = canViewAdminFinancials(viewer.role);
  const [products, options] = await Promise.all([
    getAdminProducts(viewer.role),
    getAdminProductOptions(),
  ]);

  return (
    <AdminProductCatalogTable
      locale={locale}
      canViewFinancials={canViewFinancials}
      products={products.map((product) => {
        const translation = pickAdminTranslation(product.translations, locale);
        const category = pickAdminTranslation(product.category.translations, locale);

        return {
          id: product.id,
          name: translation.name,
          categoryName: category.name,
          heroImage: product.heroImage,
          sku: product.sku,
          status: product.status,
          price: product.price,
          purchasePrice: canViewFinancials ? product.purchasePrice : null,
          unitFinancials: canViewFinancials
            ? calculateUnitFinancials({
                price: product.price,
                purchasePrice: product.purchasePrice,
              })
            : {
                revenue: product.price,
                purchasePrice: null,
                marginValue: null,
                marginPercent: null,
                profitPerUnit: null,
              },
          currency: product.currency,
          stock: product.stock,
          updatedAt: product.updatedAt.toISOString(),
        };
      })}
      categories={options.categories.map((category) => ({
        id: category.id,
        name: pickAdminTranslation(category.translations, locale).name,
      }))}
    />
  );
}
