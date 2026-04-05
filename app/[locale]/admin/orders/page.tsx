import { OrderStatusControl } from "@/components/admin/order-status-control";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import { canViewAdminFinancials, getAdminOrders, requireAdminAccess } from "@/lib/admin";
import {
  getOrderDeliveryMethodLabel,
  getOrderKindLabel,
  getOrderKindTone,
  getOrderNumber,
  getOrderStatusLabel,
  getOrderStatusTone,
  normalizeOrderStatus,
  ORDER_STATUSES,
  isOrderDeliveryMethod,
  type OrderDeliveryMethod,
} from "@/lib/storefront/orders";
import { formatPrice } from "@/lib/utils";

function getLabels(locale: "uk" | "ru" | "en") {
  return {
    title:
      locale === "uk" ? "Замовлення товарів" : locale === "ru" ? "Заказы товаров" : "Store orders",
    subtitle:
      locale === "uk"
        ? "Пошук, фільтрація та швидке оновлення статусу без переходу в кожен заказ."
        : locale === "ru"
          ? "Поиск, фильтрация и быстрое обновление статуса без перехода в каждый заказ."
          : "Search, filter, and update status without opening every order.",
    searchPlaceholder:
      locale === "uk"
        ? "Номер, ім'я, телефон або email"
        : locale === "ru"
          ? "Номер, имя, телефон или email"
          : "Order number, name, phone, or email",
    allStatuses: locale === "uk" ? "Усі статуси" : locale === "ru" ? "Все статусы" : "All statuses",
    search: locale === "uk" ? "Знайти" : locale === "ru" ? "Найти" : "Search",
    reset: locale === "uk" ? "Скинути" : locale === "ru" ? "Сбросить" : "Reset",
    noOrders:
      locale === "uk" ? "Замовлень поки немає." : locale === "ru" ? "Заказов пока нет." : "No orders yet.",
    noResults:
      locale === "uk"
        ? "За поточними фільтрами нічого не знайдено."
        : locale === "ru"
          ? "По текущим фильтрам ничего не найдено."
          : "No orders match the current filters.",
    city: locale === "uk" ? "Місто" : locale === "ru" ? "Город" : "City",
    delivery: locale === "uk" ? "Доставка" : locale === "ru" ? "Доставка" : "Delivery",
    items: locale === "uk" ? "Склад" : locale === "ru" ? "Состав" : "Contents",
    total: locale === "uk" ? "Сума" : locale === "ru" ? "Сумма" : "Total",
    open: locale === "uk" ? "Відкрити" : locale === "ru" ? "Открыть" : "Open",
    account: locale === "uk" ? "Акаунт" : locale === "ru" ? "Аккаунт" : "Account",
  };
}

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en" }>;
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const [{ locale }, filters] = await Promise.all([params, searchParams]);
  const q = filters.q?.trim() ?? "";
  const status = filters.status?.trim() ?? "";
  const viewer = await requireAdminAccess(locale);
  const canViewFinancials = canViewAdminFinancials(viewer.role);
  const orders = await getAdminOrders({ query: q, status }, viewer.role);
  const labels = getLabels(locale);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {labels.title}
        </h2>
        <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{labels.subtitle}</p>
      </section>

      <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <form className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={labels.searchPlaceholder}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          />
          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            <option value="">{labels.allStatuses}</option>
            {ORDER_STATUSES.map((option) => (
              <option key={option} value={option}>
                {getOrderStatusLabel(option, locale)}
              </option>
            ))}
          </select>
          <Button type="submit">{labels.search}</Button>
          <Link href="/admin/orders">
            <Button variant="secondary" className="w-full">
              {labels.reset}
            </Button>
          </Link>
        </form>
      </section>

      <section className="grid gap-4">
        {orders.length === 0 ? (
          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 text-sm leading-7 text-[color:var(--color-text-soft)] shadow-[var(--shadow-soft)]">
            {q || status ? labels.noResults : labels.noOrders}
          </article>
        ) : (
          orders.map((order) => {
            const resolvedStatus = normalizeOrderStatus(order.status);
            const deliveryMethod: OrderDeliveryMethod | null =
              isOrderDeliveryMethod(order.deliveryMethod ?? "")
                ? (order.deliveryMethod as OrderDeliveryMethod)
                : null;

            return (
              <article
                key={order.id}
                className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                        {getOrderNumber(order.id)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderStatusTone(resolvedStatus)}`}>
                        {getOrderStatusLabel(resolvedStatus, locale)}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getOrderKindTone(order.orderKind)}`}>
                        {getOrderKindLabel(order.orderKind, locale)}
                      </span>
                      {order.userId ? (
                        <span className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text)]">
                          {labels.account}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{order.customerName}</h3>
                      <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                        {order.phone}
                        {order.email ? ` · ${order.email}` : ""}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-[color:var(--color-text-soft)] sm:grid-cols-2">
                      <p>
                        {labels.city}: <span className="text-[color:var(--color-text)]">{order.deliveryCity ?? "—"}</span>
                      </p>
                      <p>
                        {labels.delivery}:{" "}
                        <span className="text-[color:var(--color-text)]">
                          {deliveryMethod ? getOrderDeliveryMethodLabel(deliveryMethod, locale) : "—"}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {order.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full bg-[color:var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[color:var(--color-text-soft)]"
                        >
                          {item.productName} x{item.quantity}
                        </span>
                      ))}
                      {order.items.length > 3 ? (
                        <span className="rounded-full bg-[color:var(--color-surface-elevated)] px-3 py-1.5 text-xs text-[color:var(--color-text-soft)]">
                          +{order.items.length - 3}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                        {labels.total}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[color:var(--color-text)]">
                        {formatPrice(order.totalPrice, locale, order.currency)}
                      </p>
                      {canViewFinancials ? (
                        <p className="mt-2 text-xs text-[color:var(--color-text-soft)]">
                          {locale === "uk" ? "Прибуток" : locale === "ru" ? "Прибыль" : "Profit"}:{" "}
                          <span className="text-[color:var(--color-text)]">
                            {typeof order.financials.grossProfit === "number"
                              ? formatPrice(order.financials.grossProfit, locale, order.currency)
                              : "—"}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <OrderStatusControl
                      orderId={order.id}
                      locale={locale}
                      value={resolvedStatus}
                      managerNote={order.managerNote}
                      compact
                    />

                    <Link href={`/admin/orders/${order.id}`} className="inline-flex w-full">
                      <Button variant="secondary" className="w-full">
                        {labels.open}
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
