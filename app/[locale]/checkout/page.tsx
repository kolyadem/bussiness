import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { getCheckoutPageData } from "@/lib/storefront/order-data";
import { getOrderItemConfigurationLabel } from "@/lib/storefront/orders";
import { mapProduct } from "@/lib/storefront/queries";
import { pageMetadata } from "@/lib/storefront/seo";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "cartSeoTitle",
    locale === "uk" ? "Оформлення замовлення" : locale === "ru" ? "Оформление заказа" : "Checkout",
    "/checkout",
    {
      title: locale === "uk" ? "Оформлення замовлення" : locale === "ru" ? "Оформление заказа" : "Checkout",
      indexable: false,
    },
  );
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const { cart, prefill } = await getCheckoutPageData(locale);

  if (!cart || cart.items.length === 0) {
    redirect(`/${locale}/cart`);
  }

  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const currency = cart.items[0]?.product.currency ?? "USD";

  return (
    <main className="storefront-shell mx-auto w-full max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="max-w-3xl">
          <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
            {locale === "uk" ? "Оформлення замовлення" : locale === "ru" ? "Оформление заказа" : "Checkout"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
            {locale === "uk"
              ? "Перевірте склад кошика, залиште контакти та підтвердьте замовлення без зайвих кроків."
              : locale === "ru"
                ? "Проверьте состав корзины, оставьте контакты и подтвердите заказ без лишних шагов."
                : "Review your cart, leave your details, and place the order without extra friction."}
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-5 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
            {locale === "uk" ? "Контактні дані" : locale === "ru" ? "Контактные данные" : "Contact details"}
          </h2>
          <CheckoutForm locale={locale} prefill={prefill} />
        </section>

        <aside className="space-y-6 xl:sticky xl:top-[calc(var(--header-offset)+0.75rem)] xl:self-start">
          <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                {locale === "uk" ? "Ваше замовлення" : locale === "ru" ? "Ваш заказ" : "Your order"}
              </h2>
              <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-xs text-[color:var(--color-text-soft)]">
                {itemCount} {locale === "uk" ? "позицій" : locale === "ru" ? "позиций" : "items"}
              </span>
            </div>
            <div className="mt-5 grid gap-4">
              {cart.items.map((item) => {
                const product = mapProduct(item.product, locale);

                return (
                  <article
                    key={item.id}
                    className="grid gap-4 rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4 sm:grid-cols-[96px_minmax(0,1fr)]"
                  >
                    <ProductImageFrame
                      src={product.heroImage}
                      alt={product.name}
                      className="rounded-[1.2rem]"
                      fillClassName="p-3"
                    />
                    <div className="flex min-w-0 flex-col justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-base font-medium text-[color:var(--color-text)]">
                          {product.name}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                          {product.category.name}
                        </p>
                        {item.configuration ? (
                          <p className="mt-2 text-xs leading-6 text-[color:var(--color-accent-strong)]">
                            {getOrderItemConfigurationLabel(item.configuration, locale) ?? item.configuration}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-[color:var(--color-text-soft)]">
                          {t("quantity")}: {item.quantity}
                        </span>
                        <span className="font-semibold text-[color:var(--color-text)]">
                          {formatPrice(product.price * item.quantity, locale, product.currency)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="space-y-3 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
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
                  <span className="text-sm text-[color:var(--color-text-soft)]">
                    {locale === "uk" ? "До сплати" : locale === "ru" ? "Итого" : "Total"}
                  </span>
                  <span className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                    {formatPrice(subtotal, locale, currency)}
                  </span>
                </div>
              </div>
            </div>
            <Link href="/cart" className="mt-4 inline-flex w-full">
              <Button variant="secondary" className="w-full">
                {locale === "uk" ? "Повернутися до кошика" : locale === "ru" ? "Вернуться в корзину" : "Back to cart"}
              </Button>
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}
