import { notFound } from "next/navigation";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { canViewAdminFinancials, getAdminOrderById, requireAdminAccess } from "@/lib/admin";
import { Link } from "@/lib/i18n/routing";
import {
  getOrderDeliveryMethodLabel,
  getOrderItemConfigurationLabel,
  getOrderKindLabel,
  getOrderKindTone,
  getOrderNumber,
  getOrderStatusLabel,
  getOrderStatusTone,
  isOrderDeliveryMethod,
  normalizeOrderStatus,
  type OrderDeliveryMethod,
} from "@/lib/storefront/orders";
import { formatPrice } from "@/lib/utils";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en"; id: string }>;
}) {
  const { locale, id } = await params;
  const viewer = await requireAdminAccess(locale);
  const canViewFinancials = canViewAdminFinancials(viewer.role);
  const order = await getAdminOrderById(id, viewer.role);

  if (!order) {
    notFound();
  }

  const status = normalizeOrderStatus(order.status);
  const deliveryMethod: OrderDeliveryMethod | null = isOrderDeliveryMethod(order.deliveryMethod ?? "")
    ? (order.deliveryMethod as OrderDeliveryMethod)
    : null;

  const copy = {
    back: locale === "uk" ? "Назад до замовлень" : locale === "ru" ? "Назад к заказам" : "Back to orders",
    contact: locale === "uk" ? "Контакти" : locale === "ru" ? "Контакты" : "Contact details",
    client: locale === "uk" ? "Клієнт" : locale === "ru" ? "Клиент" : "Client",
    phone: locale === "uk" ? "Телефон" : locale === "ru" ? "Телефон" : "Phone",
    account: locale === "uk" ? "Акаунт" : locale === "ru" ? "Аккаунт" : "Account",
    guest: locale === "uk" ? "Гість" : locale === "ru" ? "Гость" : "Guest",
    delivery: locale === "uk" ? "Доставка" : locale === "ru" ? "Доставка" : "Delivery",
    city: locale === "uk" ? "Місто" : locale === "ru" ? "Город" : "City",
    method: locale === "uk" ? "Спосіб" : locale === "ru" ? "Способ" : "Method",
    address: locale === "uk" ? "Адреса" : locale === "ru" ? "Адрес" : "Address",
    branch: locale === "uk" ? "Відділення" : locale === "ru" ? "Отделение" : "Branch",
    comment:
      locale === "uk"
        ? "Коментар клієнта"
        : locale === "ru"
          ? "Комментарий клиента"
          : "Customer comment",
    managerNote:
      locale === "uk" ? "Нотатка менеджера" : locale === "ru" ? "Заметка менеджера" : "Manager note",
    items: locale === "uk" ? "Склад замовлення" : locale === "ru" ? "Состав заказа" : "Order items",
    revenue: locale === "uk" ? "Виручка" : locale === "ru" ? "Выручка" : "Revenue",
    cost: locale === "uk" ? "Собівартість" : locale === "ru" ? "Себестоимость" : "Cost",
    profit: locale === "uk" ? "Прибуток" : locale === "ru" ? "Прибыль" : "Profit",
    management:
      locale === "uk"
        ? "Управління замовленням"
        : locale === "ru"
          ? "Управление заказом"
          : "Order management",
    grossProfit:
      locale === "uk" ? "Валовий прибуток" : locale === "ru" ? "Валовая прибыль" : "Gross profit",
    margin: locale === "uk" ? "Маржа" : locale === "ru" ? "Маржа" : "Margin",
    itemsCount: locale === "uk" ? "Позицій" : locale === "ru" ? "Позиций" : "Items",
    missingCost:
      locale === "uk"
        ? "Для частини позицій ще не задано закупівлю."
        : locale === "ru"
          ? "Для части позиций еще не задана закупка."
          : "Some items still have no purchase cost.",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <Link
          href="/admin/orders"
          className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
        >
          {copy.back}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {getOrderNumber(order.id)}
          </h2>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderStatusTone(status)}`}>
            {getOrderStatusLabel(status, locale)}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderKindTone(order.orderKind)}`}>
            {getOrderKindLabel(order.orderKind, locale)}
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.contact}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.client}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.customerName}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.phone}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.phone}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">Email</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.email ?? "—"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.account}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {order.user ? order.user.name || order.user.email || order.user.login || order.user.id : copy.guest}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.delivery}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.city}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.deliveryCity ?? "—"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.method}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {deliveryMethod ? getOrderDeliveryMethodLabel(deliveryMethod, locale) : "—"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.address}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.deliveryAddress ?? "—"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.branch}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.deliveryBranch ?? "—"}</p>
              </div>
            </div>

            {order.comment ? (
              <div className="mt-3 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.comment}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-text)]">{order.comment}</p>
              </div>
            ) : null}

            {order.managerNote ? (
              <div className="mt-3 rounded-[1.4rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.managerNote}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[color:var(--color-text)]">{order.managerNote}</p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.items}</h3>
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
                      {item.productSlug ? (
                        <Link
                          href={`/product/${item.productSlug}`}
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
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[color:var(--color-text-soft)]">
                        <span>
                          {copy.revenue}:{" "}
                          <span className="text-[color:var(--color-text)]">
                            {formatPrice(item.unitPrice * item.quantity, locale, item.currency)}
                          </span>
                        </span>
                        {canViewFinancials ? (
                          <>
                            <span>
                              {copy.cost}:{" "}
                              <span className="text-[color:var(--color-text)]">
                                {typeof item.unitCost === "number"
                                  ? formatPrice(item.unitCost * item.quantity, locale, item.currency)
                                  : "—"}
                              </span>
                            </span>
                            <span>
                              {copy.profit}:{" "}
                              <span className="text-[color:var(--color-text)]">
                                {typeof item.unitCost === "number"
                                  ? formatPrice(
                                      item.unitPrice * item.quantity - item.unitCost * item.quantity,
                                      locale,
                                      item.currency,
                                    )
                                  : "—"}
                              </span>
                            </span>
                          </>
                        ) : null}
                      </div>
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
          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.management}</h3>
            <div className="mt-4">
              <OrderStatusControl
                orderId={order.id}
                locale={locale}
                value={status}
                managerNote={order.managerNote}
                showNote
              />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <div className="grid gap-3">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.revenue}</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                  {formatPrice(order.financials.revenue, locale, order.currency)}
                </p>
              </div>
              {canViewFinancials ? (
                <>
                  <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                    <p className="text-sm text-[color:var(--color-text-soft)]">{copy.cost}</p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                      {typeof order.financials.cost === "number"
                        ? formatPrice(order.financials.cost, locale, order.currency)
                        : "—"}
                    </p>
                    {!order.financials.hasCompleteCostBasis ? (
                      <p className="mt-2 text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.missingCost}</p>
                    ) : null}
                  </div>
                  <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                    <p className="text-sm text-[color:var(--color-text-soft)]">{copy.grossProfit}</p>
                    <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
                      {typeof order.financials.grossProfit === "number"
                        ? formatPrice(order.financials.grossProfit, locale, order.currency)
                        : "—"}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[color:var(--color-text-soft)]">
                      {copy.margin}:{" "}
                      <span className="text-[color:var(--color-text)]">
                        {typeof order.financials.marginPercent === "number"
                          ? `${order.financials.marginPercent.toFixed(1)}%`
                          : "—"}
                      </span>
                    </p>
                  </div>
                </>
              ) : null}
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">{copy.itemsCount}</p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">{order.items.length}</p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
