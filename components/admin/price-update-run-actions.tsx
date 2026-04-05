"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  mapBaseSourceLabel,
  mapConfidenceLabel,
  mapLineStatusLabel,
  mapRetailAvailabilityLabel,
  priceUpdatesT,
  priceUpdatesTFormat,
} from "@/lib/admin/price-updates-ui";

export type PriceUpdateRunLineView = {
  id: string;
  skuSnapshot: string;
  nameSnapshot: string;
  userApproved: boolean;
  newPriceStored: number | null;
  priceBeforeDisplay: string;
  newPriceDisplay: string;
  rozetkaPriceUah: number | null;
  telemartPriceUah: number | null;
  basePriceUah: number | null;
  baseSource: string | null;
  lineStatus: string;
  confidence: string;
  matchNote: string;
  rozetkaAvailability: string;
  telemartAvailability: string;
  candidateAvailability: string;
  availabilityRationale: string;
};

export function PriceUpdateRunClient({
  locale,
  runId,
  runStatus,
  lines,
}: {
  locale: string;
  runId: string;
  runStatus: string;
  lines: PriceUpdateRunLineView[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const initial = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const l of lines) {
      m[l.id] = l.userApproved;
    }
    return m;
  }, [lines]);

  const [approvedMap, setApprovedMap] = useState<Record<string, boolean>>(initial);

  function setLine(lineId: string, value: boolean) {
    setApprovedMap((prev) => ({ ...prev, [lineId]: value }));
  }

  async function saveApprovals() {
    setBusy(true);
    try {
      const payload = {
        lines: lines.map((l) => ({
          id: l.id,
          userApproved: approvedMap[l.id] ?? false,
        })),
      };
      const res = await fetch(`/api/admin/price-updates/runs/${runId}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? priceUpdatesT(locale, "toastSaveFail"));
        return;
      }
      toast.success(priceUpdatesT(locale, "toastSaveOk"));
      router.refresh();
    } catch {
      toast.error(priceUpdatesT(locale, "toastNetwork"));
    } finally {
      setBusy(false);
    }
  }

  async function applyApproved() {
    setBusy(true);
    try {
      const savePayload = {
        lines: lines.map((l) => ({
          id: l.id,
          userApproved: approvedMap[l.id] ?? false,
        })),
      };
      const saveRes = await fetch(`/api/admin/price-updates/runs/${runId}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });
      const saveData = (await saveRes.json()) as { ok?: boolean; error?: string };
      if (!saveRes.ok || !saveData.ok) {
        toast.error(saveData.error ?? priceUpdatesT(locale, "toastSaveFail"));
        return;
      }

      const res = await fetch(`/api/admin/price-updates/runs/${runId}/apply`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        appliedCount?: number;
        skippedStale?: Array<{ sku: string; reason: string }>;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? priceUpdatesT(locale, "toastApplyFail"));
        return;
      }
      toast.success(priceUpdatesTFormat(locale, "toastApplyOk", String(data.appliedCount ?? 0)));
      if (data.skippedStale && data.skippedStale.length > 0) {
        console.warn(data.skippedStale);
        toast.message(priceUpdatesTFormat(locale, "toastSkippedStale", String(data.skippedStale.length)));
      }
      router.push(`/${locale}/admin/price-updates`);
      router.refresh();
    } catch {
      toast.error(priceUpdatesT(locale, "toastNetwork"));
    } finally {
      setBusy(false);
    }
  }

  const canEdit = runStatus === "PREVIEW_READY";
  const hasApproved = lines.some(
    (l) => (approvedMap[l.id] ?? false) && l.newPriceStored != null && l.lineStatus !== "REJECTED",
  );

  return (
    <div className="space-y-4">
      {canEdit ? (
        <p className="rounded-[1rem] border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-sm text-[color:var(--color-text)]">
          <strong className="text-amber-900 dark:text-amber-100">{priceUpdatesT(locale, "warnBeforeApplyTitle")}</strong>{" "}
          {priceUpdatesT(locale, "warnBeforeApplyBody")}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!canEdit || busy}
          onClick={saveApprovals}
          className="rounded-[1.2rem] border border-[color:var(--color-line-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text)] disabled:opacity-50"
        >
          {priceUpdatesT(locale, "btnSaveApprovals")}
        </button>
        <button
          type="button"
          disabled={!canEdit || busy || !hasApproved}
          onClick={applyApproved}
          className="rounded-[1.2rem] bg-[color:var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {priceUpdatesT(locale, "btnApply")}
        </button>
      </div>
      <p className="text-xs text-[color:var(--color-text-soft)]">{priceUpdatesT(locale, "colMatchNoteHint")}</p>
      <div className="overflow-x-auto rounded-[1.2rem] border border-[color:var(--color-line-strong)]">
        <table className="w-full min-w-[1520px] border-collapse text-left text-sm">
          <thead className="bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]">
            <tr>
              <th className="p-3">{priceUpdatesT(locale, "thApprove")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thArticle")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thName")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thCurrent")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thRozetka")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thAvailRoz")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thTelemart")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thAvailTm")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thBase")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thNew")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thAvailCandidate")}</th>
              <th className="p-3 max-w-[220px]">{priceUpdatesT(locale, "thAvailExplain")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thStatus")}</th>
              <th className="p-3">{priceUpdatesT(locale, "thConfidence")}</th>
              <th className="p-3 max-w-[200px]">{priceUpdatesT(locale, "thMatchNote")}</th>
            </tr>
          </thead>
          <tbody className="text-[color:var(--color-text)]">
            {lines.map((line) => (
              <tr key={line.id} className="border-t border-[color:var(--color-line-strong)]">
                <td className="p-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--color-accent)]"
                    checked={approvedMap[line.id] ?? false}
                    disabled={!canEdit || line.lineStatus === "REJECTED"}
                    title={
                      line.lineStatus === "REJECTED" ? priceUpdatesT(locale, "checkboxRejectTitle") : undefined
                    }
                    onChange={(e) => setLine(line.id, e.target.checked)}
                  />
                </td>
                <td className="p-3 font-mono text-xs">{line.skuSnapshot}</td>
                <td className="p-3 max-w-[220px]">{line.nameSnapshot}</td>
                <td className="p-3">{line.priceBeforeDisplay}</td>
                <td className="p-3">{line.rozetkaPriceUah ?? "—"}</td>
                <td className="p-3 text-xs">{mapRetailAvailabilityLabel(locale, line.rozetkaAvailability)}</td>
                <td className="p-3">{line.telemartPriceUah ?? "—"}</td>
                <td className="p-3 text-xs">{mapRetailAvailabilityLabel(locale, line.telemartAvailability)}</td>
                <td className="p-3">
                  {line.basePriceUah ?? "—"}{" "}
                  {line.baseSource ? `(${mapBaseSourceLabel(locale, line.baseSource)})` : ""}
                </td>
                <td className="p-3">{line.newPriceDisplay}</td>
                <td className="p-3 text-xs">{mapRetailAvailabilityLabel(locale, line.candidateAvailability)}</td>
                <td className="p-3 max-w-[220px] text-xs text-[color:var(--color-text-soft)]">
                  {line.availabilityRationale || "—"}
                </td>
                <td className="p-3 text-xs">{mapLineStatusLabel(locale, line.lineStatus)}</td>
                <td className="p-3 text-xs">{mapConfidenceLabel(locale, line.confidence)}</td>
                <td className="p-3 max-w-[200px] text-xs text-[color:var(--color-text-soft)]">
                  {line.matchNote || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
