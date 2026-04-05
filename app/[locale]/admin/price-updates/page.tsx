import { PriceRollbackList, type RollbackRow } from "@/components/admin/price-rollback-list";
import { PriceUpdatePreviewStarter } from "@/components/admin/price-update-preview-starter";
import { PriceUpdateSafetyNotice } from "@/components/admin/price-update-safety-notice";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin";
import { canManageAdminPriceUpdates } from "@/lib/admin/permissions";
import { mapRunStatusLabel, priceUpdatesT } from "@/lib/admin/price-updates-ui";
import { Link } from "@/lib/i18n/routing";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function AdminPriceUpdatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireAdminAccess(locale);

  if (
    !canManageAdminPriceUpdates({
      role: user.role,
      canAccessPriceUpdates: user.canAccessPriceUpdates,
    })
  ) {
    notFound();
  }

  const runs = await db.priceUpdateRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      status: true,
      createdAt: true,
      appliedAt: true,
      _count: { select: { lines: true } },
    },
  });

  const historyRows = await db.priceChangeHistory.findMany({
    where: { rolledBackAt: null },
    orderBy: { appliedAt: "desc" },
    take: 30,
    include: {
      product: { select: { sku: true, currency: true } },
    },
  });

  const rollbackData: RollbackRow[] = historyRows.map((h) => ({
    id: h.id,
    appliedAt: h.appliedAt.toISOString(),
    productSku: h.product.sku,
    previousPriceDisplay: formatPrice(h.previousPriceStored, locale, h.product.currency),
    newPriceDisplay: formatPrice(h.newPriceStored, locale, h.product.currency),
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-[color:var(--color-text)]">
          {priceUpdatesT(locale, "listTitle")}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{priceUpdatesT(locale, "listIntro")}</p>
      </div>

      <PriceUpdateSafetyNotice locale={locale} />

      <PriceUpdatePreviewStarter locale={locale} />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[color:var(--color-text)]">
          {priceUpdatesT(locale, "sectionRecentRuns")}
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-[color:var(--color-text-soft)]">{priceUpdatesT(locale, "emptyRuns")}</p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-line-strong)] rounded-[1.2rem] border border-[color:var(--color-line-strong)]">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <Link
                    href={`/admin/price-updates/${r.id}`}
                    className="font-mono text-sm font-semibold text-[color:var(--color-accent)]"
                  >
                    {r.id.slice(0, 8)}…
                  </Link>
                  <span className="ml-2 text-xs text-[color:var(--color-text-soft)]">
                    {mapRunStatusLabel(locale, r.status)}
                  </span>
                </div>
                <div className="text-xs text-[color:var(--color-text-soft)]">
                  {r._count.lines} {priceUpdatesT(locale, "runLinesLabel")} · {r.createdAt.toISOString().slice(0, 10)}
                  {r.appliedAt
                    ? ` · ${priceUpdatesT(locale, "runAppliedOn")} ${r.appliedAt.toISOString().slice(0, 10)}`
                    : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[color:var(--color-text)]">
          {priceUpdatesT(locale, "sectionRollback")}
        </h2>
        <PriceRollbackList rows={rollbackData} locale={locale} />
      </section>
    </div>
  );
}
