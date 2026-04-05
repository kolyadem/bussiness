import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AccountAuthPanel } from "@/components/auth/account-auth-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ListRemoveButton } from "@/components/product/list-remove-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { hasRole, USER_ROLES } from "@/lib/auth";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/storefront/seo";
import {
  getBuildRequestNumber,
  getBuildRequestStatusLabel,
  getBuildRequestStatusTone,
  type BuildRequestStatus,
} from "@/lib/storefront/build-requests";
import {
  getOrderDeliveryMethodLabel,
  getOrderKindLabel,
  getOrderKindTone,
  getOrderNumber,
  getOrderStatusLabel,
  getOrderStatusTone,
  isOrderDeliveryMethod,
  normalizeOrderStatus,
} from "@/lib/storefront/orders";
import { getAccountSurfaceData } from "@/lib/storefront/queries";
import { formatPrice } from "@/lib/utils";

function formatDate(value: Date, locale: AppLocale) {
  return new Intl.DateTimeFormat(
    locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return pageMetadata(locale, "homeSeoTitle", `${t("accountTitle")} Lumina Tech`, "/account", {
    title: t("accountTitle"),
    indexable: false,
  });
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const account = await getAccountSurfaceData(locale);
  const hasAdminAccess = hasRole(account.viewer?.role, USER_ROLES.manager);

  if (!account.isAuthenticated) {
    return (
      <main className="storefront-shell mx-auto flex min-h-[calc(100vh-14rem)] items-center justify-center px-4 py-10 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
        <section className="w-full rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8 lg:max-w-[36rem] lg:p-10">
          <div className="space-y-6 text-center">
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
              {t("accountTitle")}
            </h1>
            <AccountAuthPanel />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <section className="rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-8 lg:p-10">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
                {t("accountTitle")}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                {hasAdminAccess ? (
                  <Link
                    href="/admin"
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[color:var(--color-line)] px-4 text-sm text-[color:var(--color-text)] transition hover:border-[color:var(--color-line-strong)] hover:bg-[color:var(--color-surface-elevated)]"
                  >
                    {locale === "uk" ? "Адмін-панель" : locale === "ru" ? "Админ-панель" : "Admin panel"}
                  </Link>
                ) : null}
                <SignOutButton />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-[1.7rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {locale === "uk" ? "Замовлення" : locale === "ru" ? "Заказы" : "Orders"}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
                  {account.orders.length}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {locale === "uk" ? "Заявки на збірку" : locale === "ru" ? "Заявки на сборку" : "Build requests"}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
                  {account.buildRequests.length}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {t("accountFavorites")}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
                  {account.wishlist.length}
                </p>
              </div>
              <div className="rounded-[1.7rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {t("accountSavedBuilds")}
                </p>
                <p className="mt-2 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
                  {account.builds.length}
                </p>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="font-heading text-2xl font-semibold text-[color:var(--color-text)]">
              {account.viewer?.name ?? account.viewer?.login ?? t("accountProfileLabel")}
            </h2>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {t("accountMode")}
                </p>
                <p className="mt-2 font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                  {hasAdminAccess
                    ? locale === "uk"
                      ? "Адміністратор"
                      : locale === "ru"
                        ? "Администратор"
                        : "Administrator"
                    : t("accountClient")}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {t("subtotal")}
                </p>
                <p className="mt-2 font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                  {formatPrice(account.cartSubtotal, locale)}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                  {account.cartItemsCount} {t("accountItems")}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] 2xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
        <div className="grid gap-6">
          <section className="rounded-[2.2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-heading text-3xl font-semibold text-[color:var(--color-text)]">
                {locale === "uk" ? "Замовлення товарів" : locale === "ru" ? "Заказы товаров" : "Store orders"}
              </h2>
              {account.orders.length > 0 ? (
                <Link
                  href="/cart"
                  className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
                >
                  {locale === "uk" ? "До кошика" : locale === "ru" ? "В корзину" : "Go to cart"}
                </Link>
              ) : null}
            </div>
            {account.orders.length === 0 ? (
              <EmptyState
                title={locale === "uk" ? "Ще немає замовлень" : locale === "ru" ? "Заказов пока нет" : "No orders yet"}
                action={
                  <Link href="/catalog">
                    <Button variant="secondary">{t("continueShopping")}</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4">
                {account.orders.map((order) => {
                  const status = normalizeOrderStatus(order.status);

                  return (
                    <article
                      key={order.id}
                      className="rounded-[1.8rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                              {getOrderNumber(order.id)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderStatusTone(status)}`}>
                              {getOrderStatusLabel(status, locale)}
                            </span>
                            <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderKindTone(order.orderKind)}`}>
                              {getOrderKindLabel(order.orderKind, locale)}
                            </span>
                          </div>
                          <p className="text-sm text-[color:var(--color-text-soft)]">{formatDate(order.createdAt, locale)}</p>
                          <p className="text-sm text-[color:var(--color-text-soft)]">
                            {order.deliveryCity ?? "—"}
                            {order.deliveryMethod && isOrderDeliveryMethod(order.deliveryMethod)
                              ? ` · ${getOrderDeliveryMethodLabel(order.deliveryMethod, locale)}`
                              : ""}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {order.items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className="rounded-full bg-[color:var(--color-surface)] px-3 py-1.5 text-xs text-[color:var(--color-text-soft)]"
                              >
                                {item.product.name}
                                {item.configuration ? ` • ${getOrderKindLabel("CONFIGURATOR", locale)}` : ""}
                                {" "}x{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-3 lg:items-end">
                          <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-right">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                              {t("subtotal")}
                            </p>
                            <p className="mt-1 font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                              {formatPrice(order.total, locale)}
                            </p>
                          </div>
                          <Link href={`/account/orders/${order.id}`}>
                            <Button variant="secondary">
                              {locale === "uk" ? "Деталі" : locale === "ru" ? "Детали" : "Details"}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[2.2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-6">
            <h2 className="mb-5 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
              {locale === "uk" ? "Заявки на збірку" : locale === "ru" ? "Заявки на сборку" : "Build requests"}
            </h2>
            {account.buildRequests.length === 0 ? (
              <EmptyState
                title={locale === "uk" ? "Немає заявок на збірку" : locale === "ru" ? "Заявок на сборку нет" : "No build requests yet"}
              />
            ) : (
              <div className="grid gap-4">
                {account.buildRequests.map((request) => {
                  const status = (request.status || "NEW") as BuildRequestStatus;

                  return (
                    <article
                      key={request.id}
                      className="rounded-[1.8rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                              {getBuildRequestNumber(request.id)}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getBuildRequestStatusTone(status)}`}>
                              {getBuildRequestStatusLabel(status, locale)}
                            </span>
                          </div>
                          <p className="text-sm text-[color:var(--color-text-soft)]">{formatDate(request.createdAt, locale)}</p>
                          <div className="flex flex-wrap gap-2">
                            {request.items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className="rounded-full bg-[color:var(--color-surface)] px-3 py-1.5 text-xs text-[color:var(--color-text-soft)]"
                              >
                                {item.product.name} x{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3 text-right">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                            {t("subtotal")}
                          </p>
                          <p className="mt-1 font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                            {formatPrice(request.total, locale)}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="grid gap-6">
          <section className="rounded-[2.2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-6">
            <h2 className="mb-5 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
              {t("wishlistTitle")}
            </h2>
            {account.wishlist.length === 0 ? (
              <EmptyState
                title={t("wishlistTitle")}
                action={
                  <Link href="/catalog">
                    <Button variant="secondary">{t("continueShopping")}</Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-4">
                {account.wishlist.slice(0, 2).map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-4 rounded-[1.8rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4 sm:grid-cols-[112px_1fr]"
                  >
                    <ProductImageFrame
                      src={item.product.heroImage}
                      alt={item.product.name}
                      className="rounded-[1.5rem]"
                    />
                    <div className="flex flex-col justify-between gap-3">
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="font-heading text-lg font-semibold text-[color:var(--color-text)]"
                      >
                        {item.product.name}
                      </Link>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-heading text-xl font-semibold text-[color:var(--color-text)]">
                          {formatPrice(item.product.price, locale)}
                        </p>
                        <ListRemoveButton endpoint="/api/wishlist" productId={item.productId} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2.2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-6">
            <h2 className="mb-5 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
              {t("accountSavedBuilds")}
            </h2>
            {account.builds.length === 0 ? (
              <EmptyState title={t("accountEmptyBuilds")} />
            ) : (
              <div className="grid gap-4">
                {account.builds.map((build) => (
                  <article
                    key={build.id}
                    className="rounded-[1.8rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading text-xl font-semibold text-[color:var(--color-text)]">
                          <Link href={`/configurator?build=${build.slug}`} className="transition hover:text-[color:var(--color-accent-strong)]">
                            {build.name}
                          </Link>
                        </h3>
                        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                          {formatDate(build.updatedAt, locale)}
                        </p>
                      </div>
                      <p className="font-heading text-xl font-semibold text-[color:var(--color-text)]">
                        {formatPrice(build.totalPrice, locale)}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {build.items.slice(0, 4).map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full bg-[color:var(--color-surface)] px-3 py-1.5 text-xs text-[color:var(--color-text-soft)]"
                        >
                          {item.slot}: {item.product.name}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2.2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:p-6">
            <h2 className="mb-5 font-heading text-3xl font-semibold text-[color:var(--color-text)]">
              {t("accountProfileSettings")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {t("accountLocale")}
                </p>
                <p className="mt-1 text-sm font-medium uppercase text-[color:var(--color-text)]">
                  {locale}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3.5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                  {t("accountCompare")}
                </p>
                <p className="mt-1 text-sm font-medium text-[color:var(--color-text)]">
                  {account.compareCount}
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
