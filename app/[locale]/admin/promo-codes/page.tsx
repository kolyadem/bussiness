import { Ticket } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { getAdminPromoCodes, requireAdminOnlyAccess } from "@/lib/admin";
import type { PromoCodeType } from "@prisma/client";
import type { AppLocale } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<PromoCodeType, string> = {
  PERCENT_DISCOUNT: "Відсоток",
  FIXED_DISCOUNT: "Фіксована сума",
  FREE_BUILD: "Безкоштовна збірка",
};

function formatPromoValue(type: PromoCodeType, value: number, locale: AppLocale) {
  if (type === "PERCENT_DISCOUNT") {
    return `${value}%`;
  }

  if (type === "FIXED_DISCOUNT") {
    return formatPrice(value, locale, "UAH");
  }

  return "—";
}

function formatValidity(from: Date | null, until: Date | null) {
  if (!from && !until) {
    return "Без обмежень";
  }

  const opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  const a = from ? from.toLocaleDateString("uk-UA", opts) : "…";
  const b = until ? until.toLocaleDateString("uk-UA", opts) : "…";

  return `${a} — ${b}`;
}

export default async function AdminPromoCodesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await requireAdminOnlyAccess(locale);
  const query = await searchParams;
  const activeParam = Array.isArray(query.active) ? query.active[0] : query.active;
  const typeParam = Array.isArray(query.type) ? query.type[0] : query.type;

  const activeFilter =
    activeParam === "active" ? "active" : activeParam === "inactive" ? "inactive" : "all";
  const typeFilter =
    typeParam === "PERCENT_DISCOUNT" || typeParam === "FIXED_DISCOUNT" || typeParam === "FREE_BUILD"
      ? (typeParam as PromoCodeType)
      : ("ALL" as const);

  const promos = await getAdminPromoCodes({
    active: activeFilter,
    type: typeFilter,
  });

  const copy = {
    title: "Промокоди",
    add: "Новий промокод",
    code: "Код",
    name: "Назва",
    type: "Тип",
    value: "Значення",
    active: "Активність",
    usage: "Використано / ліміт",
    validity: "Термін",
    actions: "Дії",
    edit: "Редагувати",
    yes: "Так",
    no: "Ні",
    allActivity: "Усі",
    activeOnly: "Активні",
    inactiveOnly: "Неактивні",
    allTypes: "Усі типи",
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <Ticket className="mt-1 h-8 w-8 text-[color:var(--color-accent-strong)]" />
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">{copy.title}</h2>
          </div>
        </div>
        <Link href="/admin/promo-codes/new">
          <Button>{copy.add}</Button>
        </Link>
      </section>

      <section className="flex flex-wrap gap-2 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-4">
        <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-soft)]">Активність:</span>
        {(
          [
            ["all", copy.allActivity],
            ["active", copy.activeOnly],
            ["inactive", copy.inactiveOnly],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={
              key === "all"
                ? `/admin/promo-codes${typeFilter !== "ALL" ? `?type=${typeFilter}` : ""}`
                : `/admin/promo-codes?active=${key}${typeFilter !== "ALL" ? `&type=${typeFilter}` : ""}`
            }
            className={[
              "rounded-full px-3 py-1 text-sm transition",
              activeFilter === key
                ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] ring-1 ring-[color:var(--color-accent-line)]"
                : "text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
        <span className="mx-2 hidden text-[color:var(--color-line)] sm:inline">|</span>
        <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-soft)]">Тип:</span>
        {(
          [
            ["ALL", copy.allTypes],
            ["PERCENT_DISCOUNT", TYPE_LABELS.PERCENT_DISCOUNT],
            ["FIXED_DISCOUNT", TYPE_LABELS.FIXED_DISCOUNT],
            ["FREE_BUILD", TYPE_LABELS.FREE_BUILD],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={
              key === "ALL"
                ? `/admin/promo-codes${activeFilter !== "all" ? `?active=${activeFilter}` : ""}`
                : `/admin/promo-codes?type=${key}${activeFilter !== "all" ? `&active=${activeFilter}` : ""}`
            }
            className={[
              "rounded-full px-3 py-1 text-sm transition",
              typeFilter === key
                ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] ring-1 ring-[color:var(--color-accent-line)]"
                : "text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]",
            ].join(" ")}
          >
            {label}
          </Link>
        ))}
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[color:var(--color-line)]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                <th className="px-5 py-4">{copy.code}</th>
                <th className="px-5 py-4">{copy.name}</th>
                <th className="px-5 py-4">{copy.type}</th>
                <th className="px-5 py-4">{copy.value}</th>
                <th className="px-5 py-4">{copy.active}</th>
                <th className="px-5 py-4">{copy.usage}</th>
                <th className="px-5 py-4">{copy.validity}</th>
                <th className="px-5 py-4 text-right">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-line)]">
              {promos.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 font-medium text-[color:var(--color-text)]">{row.code}</td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{row.title}</td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">{TYPE_LABELS[row.type]}</td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">
                    {formatPromoValue(row.type, row.value, locale)}
                  </td>
                  <td className="px-5 py-4 text-sm">{row.isActive ? copy.yes : copy.no}</td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">
                    {row.usedCount}
                    {row.usageLimit !== null ? ` / ${row.usageLimit}` : ""}
                  </td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
                    {formatValidity(row.validFrom, row.validUntil)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/promo-codes/${row.id}/edit`}>
                      <Button variant="secondary">{copy.edit}</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {promos.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-[color:var(--color-text-soft)]">Промокодів поки немає.</p>
        ) : null}
      </section>
    </div>
  );
}
