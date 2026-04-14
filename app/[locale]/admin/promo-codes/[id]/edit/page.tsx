import { notFound } from "next/navigation";
import { updatePromoCodeAction } from "@/app/actions/admin";
import { AdminPromoCodeForm } from "@/components/admin/admin-promo-code-form";
import { getAdminPromoCodeById, getPromoCodeUsage, requireAdminOnlyAccess } from "@/lib/admin";
import { Link } from "@/lib/i18n/routing";
import { getOrderNumber } from "@/lib/storefront/orders";
import { getBuildRequestNumber } from "@/lib/storefront/build-requests";
import { getPromoEffectTypeLabelUa } from "@/lib/storefront/promo-codes";
import { formatPrice } from "@/lib/utils";
import type { AppLocale } from "@/lib/constants";

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminPromoCodeEditPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminOnlyAccess(locale);
  const [promo, usage] = await Promise.all([
    getAdminPromoCodeById(id),
    getPromoCodeUsage(id),
  ]);

  if (!promo) {
    notFound();
  }

  const totalUsage = usage.orders.length + usage.buildRequests.length;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">Редагування промокоду</h2>
        <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{promo.code}</p>
      </section>

      <AdminPromoCodeForm
        locale={locale}
        action={updatePromoCodeAction}
        mode="edit"
        promoId={promo.id}
        initialValues={{
          code: promo.code,
          title: promo.title,
          description: promo.description,
          type: promo.type,
          value: promo.value,
          isActive: promo.isActive,
          usageLimit: promo.usageLimit,
          validFrom: promo.validFrom,
          validUntil: promo.validUntil,
        }}
      />

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
          Використання промокоду
          {totalUsage > 0 ? (
            <span className="ml-2 rounded-full bg-[color:var(--color-surface-elevated)] px-2 py-0.5 text-sm font-medium text-[color:var(--color-text-soft)]">
              {totalUsage}
            </span>
          ) : null}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">Останні 20 замовлень та заявок з цим промокодом.</p>

        {totalUsage === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--color-text-soft)]">Промокод ще не використовувався.</p>
        ) : null}

        {usage.orders.length > 0 ? (
          <div className="mt-5">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
              Замовлення ({usage.orders.length})
            </h4>
            <div className="overflow-hidden rounded-[1.4rem] border border-[color:var(--color-line)]">
              <table className="min-w-full divide-y divide-[color:var(--color-line)] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                    <th className="px-4 py-3">Номер</th>
                    <th className="px-4 py-3">Клієнт</th>
                    <th className="px-4 py-3">Ефект</th>
                    <th className="px-4 py-3">Знижка</th>
                    <th className="px-4 py-3">Сума</th>
                    <th className="px-4 py-3">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-line)]">
                  {usage.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-[color:var(--color-surface-elevated)]">
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">
                        <Link href={`/admin/orders/${order.id}`} className="hover:text-[color:var(--color-accent-strong)] transition">
                          {getOrderNumber(order.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-text)]">{order.customerName}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-soft)]">{getPromoEffectTypeLabelUa(order.promoEffectType)}</td>
                      <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300">
                        {order.promoDiscountAmount > 0
                          ? `−${formatPrice(order.promoDiscountAmount, locale, order.currency)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">
                        {formatPrice(order.totalPrice, locale, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-text-soft)]">{formatDate(order.createdAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {usage.buildRequests.length > 0 ? (
          <div className="mt-5">
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
              Заявки на збірку ({usage.buildRequests.length})
            </h4>
            <div className="overflow-hidden rounded-[1.4rem] border border-[color:var(--color-line)]">
              <table className="min-w-full divide-y divide-[color:var(--color-line)] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                    <th className="px-4 py-3">Номер</th>
                    <th className="px-4 py-3">Клієнт</th>
                    <th className="px-4 py-3">Ефект</th>
                    <th className="px-4 py-3">Знижка</th>
                    <th className="px-4 py-3">Сума</th>
                    <th className="px-4 py-3">Дата</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-line)]">
                  {usage.buildRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[color:var(--color-surface-elevated)]">
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">
                        <Link href={`/admin/build-requests/${req.id}`} className="hover:text-[color:var(--color-accent-strong)] transition">
                          {getBuildRequestNumber(req.id)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-text)]">{req.customerName}</td>
                      <td className="px-4 py-3 text-[color:var(--color-text-soft)]">{getPromoEffectTypeLabelUa(req.promoEffectType)}</td>
                      <td className="px-4 py-3 text-emerald-700 dark:text-emerald-300">
                        {req.promoDiscountAmount > 0
                          ? `−${formatPrice(req.promoDiscountAmount, locale, req.currency)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">
                        {formatPrice(req.totalPrice, locale, req.currency)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--color-text-soft)]">{formatDate(req.createdAt, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
