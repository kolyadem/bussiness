import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ListRemoveButton } from "@/components/product/list-remove-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { SITE_MODES } from "@/lib/site-mode";
import { getSiteMode } from "@/lib/site-config";
import { pageMetadata } from "@/lib/storefront/seo";
import { getWishlistItems, mapProduct } from "@/lib/storefront/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "wishlistSeoTitle",
    locale === "uk"
      ? "Обране для швидкого повернення до моделей, які вже сподобалися."
      : locale === "ru"
        ? "Избранное для быстрого возвращения к товарам, которые уже заинтересовали."
        : "Wishlist for quick access to products worth coming back to.",
    "/wishlist",
    { indexable: false },
  );
}

export default async function WishlistPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const [items, siteMode] = await Promise.all([getWishlistItems(), getSiteMode()]);
  const experience = getSiteExperienceCopy(locale, siteMode);
  const description =
    locale === "uk"
      ? "Зберігайте цікаві моделі окремо, щоб повернутися до них пізніше, порівняти або додати в кошик без зайвого пошуку."
      : locale === "ru"
        ? "Сохраняйте интересные модели отдельно, чтобы позже вернуться к ним, сравнить и быстро добавить в корзину."
        : "Keep promising products in one place so you can revisit, compare, or add them to cart without searching again.";
  const emptyDescription =
    siteMode === SITE_MODES.pcBuild
      ? experience?.emptyWishlist ??
        (locale === "uk"
          ? "Зберігайте цікаві комплектуючі та ідеї для майбутньої збірки в одному місці."
          : locale === "ru"
            ? "Сохраняйте интересные комплектующие и идеи для будущей сборки в одном месте."
            : "Save promising components and ideas for the build you want to shape next.")
      : locale === "uk"
        ? "Додайте товари з каталогу в обране, щоб зібрати персональну добірку перед покупкою."
        : locale === "ru"
          ? "Добавьте товары из каталога в избранное, чтобы собрать личную подборку перед покупкой."
          : "Save products from the catalog to build a shortlist before you decide.";

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]">
              <Heart className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
              {t("wishlistTitle")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
              {description}
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]">
            {items.length} {locale === "uk" ? "збережено" : locale === "ru" ? "сохранено" : "saved"}
          </div>
        </div>
      </section>

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            title={t("emptyWishlist")}
            description={emptyDescription}
            action={
              <Link href="/catalog">
                <Button variant="secondary">{t("continueShopping")}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={mapProduct(item.product, locale)}
                locale={locale}
                siteMode={siteMode}
                footer={<ListRemoveButton endpoint="/api/wishlist" productId={item.productId} />}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
