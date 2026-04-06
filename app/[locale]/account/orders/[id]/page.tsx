import { notFound } from "next/navigation";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { getAccountOrderById } from "@/lib/storefront/order-data";
import {
  getOrderDeliveryMethodLabel,
  getOrderItemConfigurationLabel,
  getOrderKindLabel,
  getOrderKindTone,
  getOrderNumber,
  getOrderStatusLabel,
  getOrderStatusTone,
  normalizeOrderStatus,
  isOrderDeliveryMethod,
  type OrderDeliveryMethod,
} from "@/lib/storefront/orders";
import { formatPrice } from "@/lib/utils";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; id: string }>;
}) {
  const { locale, id } = await params;
  const order = await getAccountOrderById({ id, locale });

  if (!order) {
    notFound();
  }

  const status = normalizeOrderStatus(order.status);
  const deliveryMethod = isOrderDeliveryMethod(order.deliveryMethod ?? "")
    ? (order.deliveryMethod as OrderDeliveryMethod)
    : null;

  return (
    <main className="storefront-shell mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <Link
          href="/account"
          className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
        >
          Назад до акаунта
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {getOrderNumber(order.id)}
          </h1>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderStatusTone(status)}`}>
            {getOrderStatusLabel(status, locale)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderKindTone(order.orderKind)}`}>
            {getOrderKindLabel(order.orderKind, locale)}
          </span>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-xl font-semibold text-[color:var(--color-text)]">
              Склад замовлення
            </h2>
            <div className="mt-4 grid gap-4">
              {order.items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4 sm:grid-cols-[96px_minmax(0,1fr)]"
                >
                  <ProductImageFrame
                    src={item.heroImage ?? "/products/storage.svg"}
                    alt={item.productName}
                    className="rounded-[1.2rem]"
                    fillClassName="p-3"
                  />
                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <div>
                      {item.href ? (
                        <Link
                          href={item.href}
                          className="line-clamp-2 text-lg font-medium text-[color:var(--color-text)] transition hover:text-[color:var(--color-accent-strong)]"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-lg font-medium text-[color:var(--color-text)]">{item.productName}</p>
                      )}
                      <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">{item.brandName ?? "Lumina Tech"}</p>
                      {item.configuration ? (
                        <p className="mt-2 text-xs leading-6 text-[color:var(--color-accent-strong)]">
                          {getOrderItemConfigurationLabel(item.configuration, locale) ?? item.configuration}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[color:var(--color-text-soft)]">x{item.quantity}</p>
                      <p className="text-lg font-semibold text-[color:var(--color-text)]">
                        {formatPrice(item.unitPrice * item.quantity, locale, item.currency)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-[calc(var(--header-offset)+0.75rem)] xl:self-start">
          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Дата
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{formatDate(order.createdAt)}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Доставка
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {deliveryMethod ? getOrderDeliveryMethodLabel(deliveryMethod, locale) : "—"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">{order.deliveryCity ?? "—"}</p>
                {order.deliveryAddress ? (
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{order.deliveryAddress}</p>
                ) : null}
                {order.deliveryBranch ? (
                  <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
                    Відділення: {order.deliveryBranch}
                  </p>
                ) : null}
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  Підсумок
                </p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                  {formatPrice(order.totalPrice, locale, order.currency)}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
