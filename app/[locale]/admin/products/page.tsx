import { AdminProductCatalogTable } from "@/components/admin/admin-product-catalog-table";
import {
  canViewAdminFinancials,
  getAdminProductOptions,
  getAdminProducts,
  pickAdminTranslation,
  requireAdminAccess,
} from "@/lib/admin";
import { getPriceTrackingUrls } from "@/lib/admin/price-updates/metadata";
import { calculateUnitFinancials } from "@/lib/commerce/finance";
import type { AppLocale } from "@/lib/constants";

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
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
          categoryId: product.categoryId,
          heroImage: product.heroImage,
          sku: product.sku,
          slug: product.slug,
          status: product.status,
          inventoryStatus: product.inventoryStatus,
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
          hasRozetkaUrl: Boolean(getPriceTrackingUrls(product.metadata).rozetkaUrl),
          hasTelemartUrl: Boolean(getPriceTrackingUrls(product.metadata).telemartUrl),
        };
      })}
      categories={options.categories.map((category) => ({
        id: category.id,
        name: pickAdminTranslation(category.translations, locale).name,
      }))}
    />
  );
}
