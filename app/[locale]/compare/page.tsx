import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Scale } from "lucide-react";
import { ListRemoveButton } from "@/components/product/list-remove-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES } from "@/lib/site-mode";
import { getSiteMode } from "@/lib/site-config";
import { pageMetadata } from "@/lib/storefront/seo";
import { formatPrice } from "@/lib/utils";
import { getCompareItems, mapProduct } from "@/lib/storefront/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "compareSeoTitle",
    locale === "uk"
      ? "Порівняння товарів за ціною, наявністю та ключовими характеристиками."
      : locale === "ru"
        ? "Сравнение товаров по цене, наличию и ключевым характеристикам."
        : "Compare products by price, availability, and key specifications.",
    "/compare",
    { indexable: false },
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const [items, siteMode] = await Promise.all([getCompareItems(), getSiteMode()]);
  const experience = getSiteExperienceCopy(locale, siteMode);
  const products = items.map((item) => mapProduct(item.product, locale));
  const specKeys = Array.from(new Set(products.flatMap((product) => Object.keys(product.specs))));
  const rows = [
    {
      key: "price",
      label: locale === "uk" ? "Ціна" : locale === "ru" ? "Цена" : "Price",
      values: products.map((product) => formatPrice(product.price, locale, product.currency)),
    },
    {
      key: "category",
      label: t("category"),
      values: products.map((product) => product.category.name),
    },
    {
      key: "availability",
      label: locale === "uk" ? "Наявність" : locale === "ru" ? "Наличие" : "Availability",
      values: products.map((product) => product.inventoryLabel),
    },
    ...specKeys.map((key) => ({
      key,
      label: key,
      values: products.map((product) => String(product.specs[key] ?? "—")),
    })),
  ];
  const description =
    locale === "uk"
      ? "Зручно звіряйте ключові відмінності між кількома моделями, не стрибаючи між окремими сторінками товарів."
      : locale === "ru"
        ? "Сравнивайте важные различия между несколькими моделями без постоянных переходов между карточками товаров."
        : "Review the important differences between several models without bouncing between separate product pages.";
  const emptyDescription =
    siteMode === SITE_MODES.pcBuild
      ? experience?.emptyCompare ??
        (locale === "uk"
          ? "Додавайте комплектуючі в порівняння, щоб спокійно звірити характеристики перед збіркою."
          : locale === "ru"
            ? "Добавляйте комплектующие в сравнение, чтобы спокойно сверить характеристики перед сборкой."
            : "Add components to compare so you can review the trade-offs before locking the build in.")
      : locale === "uk"
        ? "Додайте кілька товарів до порівняння з каталогу або сторінки товару, щоб побачити їх поруч."
        : locale === "ru"
          ? "Добавьте несколько товаров в сравнение из каталога или карточки товара, чтобы увидеть их рядом."
          : "Add a few products from the catalog or product page to compare them side by side.";

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]">
              <Scale className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
              {t("compareTitle")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
              {description}
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]">
            {products.length} {locale === "uk" ? "моделі" : locale === "ru" ? "модели" : "models"}
          </div>
        </div>
      </section>

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState
            title={t("emptyCompare")}
            description={emptyDescription}
            action={
              <Link href="/catalog">
                <Button variant="secondary">{t("continueShopping")}</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
            <div className="overflow-x-auto">
              <table className="min-w-[1040px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 min-w-52 border-b border-r border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-5 text-left align-top">
                      <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--color-accent-strong)]">
                        {t("productSpecs")}
                      </p>
                    </th>
                    {products.map((product) => (
                      <th
                        key={product.id}
                        className="min-w-[280px] border-b border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-5 py-5 align-top"
                      >
                        <div className="space-y-4 text-left">
                          <Link href={`/product/${product.slug}`} className="block">
                            <ProductImageFrame
                              src={product.heroImage}
                              alt={product.name}
                              className="rounded-[1.4rem] border-[color:var(--color-line)]"
                            />
                          </Link>
                          <div className="space-y-2">
                            <Link
                              href={`/product/${product.slug}`}
                              className="line-clamp-2 text-lg font-semibold leading-7 text-[color:var(--color-text)] transition hover:text-[color:var(--color-accent-strong)]"
                            >
                              {product.name}
                            </Link>
                            <p className="font-heading text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                              {formatPrice(product.price, locale, product.currency)}
                            </p>
                          </div>
                          <ListRemoveButton endpoint="/api/compare" productId={product.id} compact />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key}>
                      <th
                        className={`sticky left-0 z-10 border-r border-[color:var(--color-line)] px-5 py-4 text-left text-sm font-medium capitalize text-[color:var(--color-text-soft)] ${
                          index % 2 === 0 ? "bg-[color:var(--color-surface)]" : "bg-[color:var(--color-surface-elevated)]"
                        }`}
                      >
                        {row.label}
                      </th>
                      {row.values.map((value, valueIndex) => (
                        <td
                          key={`${row.key}-${products[valueIndex]?.id ?? valueIndex}`}
                          className={`border-t border-[color:var(--color-line)] px-5 py-4 text-sm leading-7 text-[color:var(--color-text)] ${
                            index % 2 === 0 ? "bg-[color:var(--color-surface)]" : "bg-[color:var(--color-surface-elevated)]"
                          }`}
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
