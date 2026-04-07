import { PriceUpdateRunClient, type PriceUpdateRunLineView } from "@/components/admin/price-update-run-actions";
import { PriceUpdateSafetyNotice } from "@/components/admin/price-update-safety-notice";
import { db } from "@/lib/db";
import { requireAdminAccess } from "@/lib/admin";
import { canManageAdminPriceUpdates } from "@/lib/admin/permissions";
import {
  mapRunStatusLabel,
  priceUpdatesT,
  priceUpdatesTFormat,
} from "@/lib/admin/price-updates-ui";
import { Link } from "@/lib/i18n/routing";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function AdminPriceUpdateRunPage({
  params,
}: {
  params: Promise<{ locale: string; runId: string }>;
}) {
  const { locale, runId } = await params;
  const user = await requireAdminAccess(locale);

  if (
    !canManageAdminPriceUpdates({
      role: user.role,
      canAccessPriceUpdates: user.canAccessPriceUpdates,
    })
  ) {
    notFound();
  }

  const run = await db.priceUpdateRun.findUnique({
    where: { id: runId },
    include: {
      lines: { orderBy: { skuSnapshot: "asc" } },
    },
  });

  if (!run) {
    notFound();
  }

  const lines: PriceUpdateRunLineView[] = run.lines.map((line) => ({
    id: line.id,
    skuSnapshot: line.skuSnapshot,
    nameSnapshot: line.nameSnapshot,
    userApproved: line.userApproved,
    priceBeforeStored: line.priceBeforeStored,
    newPriceStored: line.newPriceStored,
    priceBeforeDisplay: formatPrice(line.priceBeforeStored, locale, line.currencySnapshot),
    newPriceDisplay:
      line.newPriceStored != null
        ? formatPrice(line.newPriceStored, locale, line.currencySnapshot)
        : "—",
    rozetkaPriceUah: line.rozetkaPriceUah,
    telemartPriceUah: line.telemartPriceUah,
    basePriceUah: line.basePriceUah,
    baseSource: line.baseSource,
    lineStatus: line.lineStatus,
    confidence: line.confidence,
    matchNote: line.matchNote,
    rozetkaAvailability: line.rozetkaAvailability,
    telemartAvailability: line.telemartAvailability,
    candidateAvailability: line.candidateAvailability,
    availabilityRationale: line.availabilityRationale,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/price-updates" className="text-sm font-medium text-[color:var(--color-accent)]">
          {priceUpdatesT(locale, "backToList")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">
          {priceUpdatesTFormat(locale, "runTitle", run.id.slice(0, 8) + "…")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
          {priceUpdatesT(locale, "runStatusLabel")}: <strong>{mapRunStatusLabel(locale, run.status)}</strong>
          {run.appliedAt
            ? ` · ${priceUpdatesT(locale, "runAppliedAt")} ${run.appliedAt.toISOString().slice(0, 19).replace("T", " ")}`
            : ""}
        </p>
      </div>

      {run.status === "PREVIEW_READY" ? <PriceUpdateSafetyNotice locale={locale} className="mb-2" /> : null}

      <PriceUpdateRunClient locale={locale} runId={run.id} runStatus={run.status} lines={lines} />
    </div>
  );
}
