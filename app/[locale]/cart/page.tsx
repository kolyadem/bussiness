import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { CartQuantityControl } from "@/components/product/cart-quantity-control";
import { ProductActions } from "@/components/product/product-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getSiteExperienceCopy } from "@/lib/site-experience";
import { type SiteMode, SITE_MODES } from "@/lib/site-mode";
import { getSiteMode } from "@/lib/site-config";
import { getCartUpsellProducts } from "@/lib/storefront/conversion";
import { getOrderItemConfigurationLabel } from "@/lib/storefront/orders";
import { pageMetadata } from "@/lib/storefront/seo";
import { formatPrice } from "@/lib/utils";
import { getCart, mapProduct } from "@/lib/storefront/queries";

type CartUpsellProduct = Awaited<ReturnType<typeof getCartUpsellProducts>>[number];

function getCartCopy(locale: AppLocale) {
  return {
    summaryLabel:
      locale === "uk" ? "Ваше замовлення" : locale === "ru" ? "Ваш заказ" : "Your selection",
    summaryNote:
      locale === "uk"
        ? "Усе готово для швидкого повернення до покупки: змінюйте кількість, прибирайте позиції та переходьте далі без зайвого шуму."
        : locale === "ru"
          ? "Здесь можно быстро скорректировать состав корзины: изменить количество, убрать позицию и продолжить выбор."
          : "Everything is ready for a smooth return to shopping: update quantities, remove items, and keep moving.",
    emptyDescription:
      locale === "uk"
        ? "Додайте кілька товарів із каталогу, щоб зібрати кошик і швидко повернутися до нього пізніше."
        : locale === "ru"
          ? "Добавьте несколько товаров из каталога, чтобы собрать корзину и вернуться к ней позже."
          : "Add a few products from the catalog to build a cart you can return to at any time.",
    totalLabel: locale === "uk" ? "До сплати зараз" : locale === "ru" ? "Итого сейчас" : "Total now",
    checkoutLabel:
      locale === "uk" ? "Оформити замовлення" : locale === "ru" ? "Оформить заказ" : "Checkout",
    itemLabel: locale === "uk" ? "позицій" : locale === "ru" ? "позиций" : "items",
    upsellTitle:
      locale === "uk" ? "Можна додати ще" : locale === "ru" ? "Можно добавить еще" : "You may also want",
    upsellText:
      locale === "uk"
        ? "Кілька доречних доповнень або сильніших варіантів поруч із поточним кошиком."
        : locale === "ru"
          ? "Несколько уместных дополнений или более сильных вариантов рядом с текущей корзиной."
          : "A few relevant add-ons or stronger alternatives next to the current cart.",
  };
}

function CartUpsellCard({
  product,
  locale,
  siteMode,
}: {
  product: CartUpsellProduct;
  locale: AppLocale;
  siteMode: SiteMode;
}) {
  return (
    <article className="grid min-w-0 gap-3 rounded-[1.35rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-3">
      <div className="grid min-w-0 grid-cols-[84px_minmax(0,1fr)] gap-3">
        <Link href={`/product/${product.slug}`} className="block">
          <ProductImageFrame
            src={product.heroImage}
            alt={product.name}
            className="rounded-[1.1rem] border-[color:var(--color-line)]"
          />
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
              {product.category.name}
            </span>
            <span className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-text)]">
              {product.inventoryLabel}
            </span>
          </div>
          <Link
            href={`/product/${product.slug}`}
            className="mt-2 block line-clamp-2 text-sm font-semibold leading-6 text-[color:var(--color-text)] transition hover:text-[color:var(--color-accent-strong)]"
          >
            {product.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--color-text-soft)]">
            {product.shortDescription}
          </p>
          <p className="mt-2 font-heading text-xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {formatPrice(product.price, locale, product.currency)}
          </p>
        </div>
      </div>
      <div className="min-w-0 overflow-hidden">
        <ProductActions
          productId={product.id}
          compact
          siteMode={siteMode}
          productCategorySlug={product.category.slug}
          context="catalog"
        />
      </div>
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "cartSeoTitle",
    locale === "uk"
      ? "РљРѕС€РёРє С–Р· РІРёР±СЂР°РЅРёРјРё С‚РѕРІР°СЂР°РјРё С‚Р° С€РІРёРґРєРёРј РґРѕСЃС‚СѓРїРѕРј РґРѕ Р·РјС–РЅРё РєС–Р»СЊРєРѕСЃС‚С–."
      : locale === "ru"
        ? "РљРѕСЂР·РёРЅР° СЃ РІС‹Р±СЂР°РЅРЅС‹РјРё С‚РѕРІР°СЂР°РјРё Рё Р±С‹СЃС‚СЂС‹Рј СѓРїСЂР°РІР»РµРЅРёРµРј РєРѕР»РёС‡РµСЃС‚РІРѕРј."
        : "Cart with selected products and quick quantity controls.",
    "/cart",
    { indexable: false },
  );
}

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const [cart, siteMode] = await Promise.all([getCart(), getSiteMode()]);
  const experience = getSiteExperienceCopy(locale, siteMode);
  const isPcBuild = siteMode === SITE_MODES.pcBuild;
  const upsellProducts = await getCartUpsellProducts(locale, cart);
  const copy = getCartCopy(locale);
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const subtotal =
    cart?.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0) ?? 0;
  const currency = cart?.items[0]?.product.currency ?? "USD";

  return (
    <main className="storefront-shell mx-auto w-full px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-6 shadow-[var(--shadow-strong)] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
              {t("cartTitle")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
              {copy.summaryNote}
            </p>
          </div>
          <div className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]">
            {itemCount} {copy.itemLabel}
          </div>
        </div>
      </section>

      <div className="mt-8">
        {!cart || cart.items.length === 0 ? (
          <EmptyState
            title={t("emptyCart")}
            description={isPcBuild ? experience?.emptyCart ?? copy.emptyDescription : copy.emptyDescription}
            action={
              <Link href="/catalog">
                <Button variant="secondary">{t("continueShopping")}</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid self-start gap-4">
              {cart.items.map((item) => {
                const product = mapProduct(item.product, locale);

                return (
                  <article
                    key={item.id}
                    className="grid gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)] md:grid-cols-[190px_minmax(0,1fr)] md:p-5"
                  >
                    <Link href={`/product/${product.slug}`} className="block">
                      <ProductImageFrame
                        src={product.heroImage}
                        alt={product.name}
                        className="rounded-[1.5rem] border-[color:var(--color-line)]"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                            {product.category.name}
                          </span>
                          <span className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text)]">
                            {product.inventoryLabel}
                          </span>
                        </div>
                        <Link
                          href={`/product/${product.slug}`}
                          className="line-clamp-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)] transition hover:text-[color:var(--color-accent-strong)]"
                        >
                          {product.name}
                        </Link>
                        <p className="line-clamp-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                          {product.shortDescription}
                        </p>
                        {item.configuration ? (
                          <p className="text-xs leading-6 text-[color:var(--color-accent-strong)]">
                            {getOrderItemConfigurationLabel(item.configuration, locale) ?? item.configuration}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4 lg:flex-row lg:items-center lg:justify-between">
                        <CartQuantityControl itemId={item.id} quantity={item.quantity} />
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                            {t("subtotal")}
                          </p>
                          <p className="mt-1 font-heading text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
                            {formatPrice(product.price * item.quantity, locale, product.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="h-fit rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] 2xl:sticky 2xl:top-[calc(var(--header-offset)+0.75rem)]">
              <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--color-accent-strong)]">
                {copy.summaryLabel}
              </p>
              <div className="mt-5 space-y-4 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5">
                <div className="flex items-center justify-between gap-4 text-sm text-[color:var(--color-text-soft)]">
                  <span>{t("quantity")}</span>
                  <span className="font-medium text-[color:var(--color-text)]">{itemCount}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm text-[color:var(--color-text-soft)]">
                  <span>{t("subtotal")}</span>
                  <span className="font-medium text-[color:var(--color-text)]">
                    {formatPrice(subtotal, locale, currency)}
                  </span>
                </div>
                <div className="border-t border-[color:var(--color-line)] pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-[color:var(--color-text-soft)]">{copy.totalLabel}</span>
                    <span className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                      {formatPrice(subtotal, locale, currency)}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/checkout" className="mt-5 inline-flex w-full">
                <Button className="h-12 w-full text-sm font-semibold">
                  {copy.checkoutLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/catalog" className="mt-3 inline-flex w-full">
                <Button variant="secondary" className="w-full">
                  {t("continueShopping")}
                </Button>
              </Link>
              {upsellProducts.length > 0 ? (
                <section className="mt-5 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[color:var(--color-text)]">
                      {copy.upsellTitle}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">
                      {copy.upsellText}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4">
                    {upsellProducts.slice(0, 3).map((product) => (
                      <CartUpsellCard
                        key={product.id}
                        product={product}
                        locale={locale}
                        siteMode={siteMode}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
