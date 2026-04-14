import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComponentsAvailabilityNotice } from "@/components/storefront/components-availability-notice";
import { CatalogClientShell } from "@/components/catalog/catalog-client-shell";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { CatalogGridPending } from "@/components/catalog/catalog-grid-pending";
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
  const pagination = data.pagination;
  const catalogPageSummary =
    pagination.totalPages > 1 && pagination.totalItems > 0
      ? (() => {
          const from = (pagination.currentPage - 1) * pagination.pageSize + 1;
          const to = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems);
          return `Сторінка ${pagination.currentPage} з ${pagination.totalPages} · товари ${from}–${to} з ${pagination.totalItems}`;
        })()
      : null;
  const emptyDescription = isPcBuild
    ? "Змініть фільтри або перейдіть у конфігуратор."
    : "Змініть фільтри або скиньте обмеження.";
  const featuredLabel =
    selectedSubcategoryName ?? selectedCategoryName ?? "Підібрані товари";

  return (
    <CatalogClientShell>
      <main className="storefront-shell mx-auto w-full px-4 py-6 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
        <section className="rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-4 py-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:px-7 sm:py-6 lg:px-9 lg:py-8 xl:px-10">
          <div className="space-y-5">
            <div className="max-w-3xl">
              <h1 className="font-heading text-3xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-4xl lg:text-5xl">
                {isPcBuild ? experience?.catalogTitle ?? t("catalogTitle") : t("catalogTitle")}
              </h1>
              <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{totalCountLabel}</p>
            </div>

            <CatalogFilters categories={categoryCards} filters={data.filters} locale={locale} priceRange={data.priceRange} />
          </div>
        </section>

        <ComponentsAvailabilityNotice className="mt-6" />

        <section className="mt-6 flex min-w-0 flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[var(--shadow-soft)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0 space-y-1">
            <p className="text-sm text-[color:var(--color-text-soft)]">
              <span className="font-medium text-[color:var(--color-text)]">{featuredLabel}</span>
              <span className="px-1.5 opacity-60">·</span>
              {totalCountLabel}
            </p>
            {catalogPageSummary ? (
              <p className="text-xs text-[color:var(--color-text-soft)]">{catalogPageSummary}</p>
            ) : null}
          </div>
          <CatalogSort sort={data.filters.sort} locale={locale} />
        </section>

        <div className="mt-6">
          <CatalogGridPending>
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
              <div className="catalog-product-grid">
                {data.products.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={mapProduct(product, locale)}
                    locale={locale}
                    siteMode={siteMode}
                    imagePriority={index < 3}
                  />
                ))}
              </div>
            )}
          </CatalogGridPending>
        </div>

        {data.pagination.totalItems > 0 ? (
          <div className="mt-8">
            <CatalogPagination pagination={data.pagination} filters={data.filters} />
          </div>
        ) : null}
      </main>
    </CatalogClientShell>
  );
}
