import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogPagination } from "@/components/catalog/catalog-pagination";
import { CatalogSort } from "@/components/catalog/catalog-sort";
import { ProductCard } from "@/components/catalog/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES } from "@/lib/site-mode";
import { getSiteMode } from "@/lib/site-config";
import { pageMetadata } from "@/lib/storefront/seo";
import {
  getCatalogData,
  mapProduct,
  parseCatalogSearchParams,
  pickByLocale,
} from "@/lib/storefront/queries";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const parsedSearchParams = parseCatalogSearchParams(await searchParams);
  const shouldIndex =
    !parsedSearchParams.q &&
    !parsedSearchParams.category &&
    !parsedSearchParams.subcategory &&
    parsedSearchParams.availability.length === 0 &&
    parsedSearchParams.minPrice === null &&
    parsedSearchParams.maxPrice === null &&
    !parsedSearchParams.onSaleOnly &&
    parsedSearchParams.sort === "newest" &&
    parsedSearchParams.page === 1;

  return pageMetadata(
    locale,
    "catalogSeoTitle",
    "Каталог комплектуючих, ноутбуків, моніторів і периферії.",
    "/catalog",
    { indexable: shouldIndex },
  );
}

export default async function CatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const t = await getTranslations({ locale });
  const parsedSearchParams = parseCatalogSearchParams(rawSearchParams);
  const [data, siteMode] = await Promise.all([
    getCatalogData({
      locale,
      params: parsedSearchParams,
    }),
    getSiteMode(),
  ]);
  const experience = getSiteExperienceCopy(locale, siteMode);
  const isPcBuild = siteMode === SITE_MODES.pcBuild;

  const categoryCards = data.categories.map((item) => ({
    slug: item.slug,
    parentId: item.parentId,
    name: pickByLocale(item.translations, locale).name,
    count: data.categoryCounts[item.slug] ?? 0,
    children: item.children.map((child) => ({
      slug: child.slug,
      name: pickByLocale(child.translations, locale).name,
    })),
  }));

  const selectedCategoryName = data.selectedCategory
    ? pickByLocale(data.selectedCategory.translations, locale).name
    : null;
  const selectedSubcategoryName = data.selectedSubcategory
    ? pickByLocale(data.selectedSubcategory.translations, locale).name
    : null;

  const resultWord = "товарів";
  const totalCountLabel = `${data.pagination.totalItems} ${resultWord}`;
  const emptyDescription = isPcBuild
    ? "Спробуйте іншу категорію комплектуючих, приберіть частину фільтрів або перейдіть до configurator для поетапного підбору."
    : "Спробуйте змінити категорію, прибрати частину фільтрів або повернутися до всього каталогу.";
  const featuredLabel =
    selectedSubcategoryName ?? selectedCategoryName ?? "Підібрані товари";

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <section className="rounded-[2.7rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-6 py-8 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-12">
        <div className="space-y-8">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
              {isPcBuild ? experience?.catalogTitle ?? t("catalogTitle") : t("catalogTitle")}
            </h1>
            <p className="mt-3 text-sm text-[color:var(--color-text-soft)]">{totalCountLabel}</p>
          </div>

          <CatalogFilters categories={categoryCards} filters={data.filters} locale={locale} />
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-5 py-5 shadow-[var(--shadow-soft)] sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--color-accent-strong)]">
            {featuredLabel}
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
            {totalCountLabel}
          </h2>
        </div>
        <CatalogSort sort={data.filters.sort} locale={locale} />
      </section>

      <div className="mt-8">
        {data.products.length === 0 ? (
          <EmptyState
            title={t("noResults")}
            description={emptyDescription}
            action={
              isPcBuild ? (
                <Link href="/configurator">
                  <Button variant="secondary">
                    {experience?.heroSecondary ?? "Відкрити configurator"}
                  </Button>
                </Link>
              ) : (
                <Link href="/catalog">
                  <Button variant="secondary">{t("clearFilters")}</Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {data.products.map((product) => (
              <ProductCard
                key={product.id}
                product={mapProduct(product, locale)}
                locale={locale}
                siteMode={siteMode}
              />
            ))}
          </div>
        )}
      </div>

      {data.pagination.totalItems > 0 ? (
        <div className="mt-10">
          <CatalogPagination pagination={data.pagination} filters={data.filters} locale={locale} />
        </div>
      ) : null}
    </main>
  );
}
