"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  priceBeforeStored: number;
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

function isSafeLine(line: PriceUpdateRunLineView): boolean {
  return (
    line.lineStatus === "APPROVED_CANDIDATE" &&
    line.confidence !== "NONE" &&
    line.confidence !== "LOW" &&
    line.newPriceStored != null
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function setLine(lineId: string, value: boolean) {
    setApprovedMap((prev) => ({ ...prev, [lineId]: value }));
  }

  function toggleSelect(lineId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) { next.delete(lineId); } else { next.add(lineId); }
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(lines.map((l) => l.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  function bulkApproveSelected() {
    setApprovedMap((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        const line = lines.find((l) => l.id === id);
        if (line && line.lineStatus !== "REJECTED") {
          next[id] = true;
        }
      }
      return next;
    });
  }

  function bulkRejectSelected() {
    setApprovedMap((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        next[id] = false;
      }
      return next;
    });
  }

  function bulkApproveSafe() {
    setApprovedMap((prev) => {
      const next = { ...prev };
      for (const line of lines) {
        if (isSafeLine(line)) {
          next[line.id] = true;
        }
      }
      return next;
    });
    toast.success(`Підтверджено safe рядки (${lines.filter(isSafeLine).length})`);
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
        toast.message(priceUpdatesTFormat(locale, "toastSkippedStale", String(data.skippedStale.length)));
      }
      router.push(`/admin/price-updates`);
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
  const approvedCount = lines.filter((l) => approvedMap[l.id]).length;
  const safeCount = lines.filter(isSafeLine).length;

  const summary = useMemo(() => {
    const total = lines.length;
    const safe = lines.filter(isSafeLine).length;
    const manualReview = lines.filter((l) => l.lineStatus === "MANUAL_REVIEW").length;
    const rejected = lines.filter((l) => l.lineStatus === "REJECTED").length;
    const noMatch = lines.filter((l) => l.newPriceStored == null).length;

    const rozetka = lines.filter((l) => l.baseSource === "ROZETKA").length;
    const telemart = lines.filter((l) => l.baseSource === "TELEMART").length;
    const noSource = lines.filter((l) => l.baseSource == null).length;

    const deltas: number[] = [];
    for (const l of lines) {
      if (l.newPriceStored != null && l.priceBeforeStored > 0) {
        deltas.push(((l.newPriceStored - l.priceBeforeStored) / l.priceBeforeStored) * 100);
      }
    }

    const BIG_DELTA = 20;
    const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const maxDelta = deltas.length > 0 ? Math.max(...deltas.map(Math.abs)) : 0;
    const bigDrops = deltas.filter((d) => d < -BIG_DELTA).length;
    const bigRises = deltas.filter((d) => d > BIG_DELTA).length;

    return { total, safe, manualReview, rejected, noMatch, rozetka, telemart, noSource, avgDelta, maxDelta, bigDrops, bigRises, hasDeltas: deltas.length > 0 };
  }, [lines]);

  return (
    <div className="space-y-4">
      {/* Run summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-soft)]">Статуси</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Всього: <strong>{summary.total}</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400">Безпечні: <strong>{summary.safe}</strong></span>
            {summary.manualReview > 0 && (
              <span className="text-amber-600 dark:text-amber-400">Перегляд: <strong>{summary.manualReview}</strong></span>
            )}
            {summary.rejected > 0 && (
              <span className="text-red-600 dark:text-red-400">Відхилені: <strong>{summary.rejected}</strong></span>
            )}
            {summary.noMatch > 0 && (
              <span className="text-[color:var(--color-text-soft)]">Без співпад.: <strong>{summary.noMatch}</strong></span>
            )}
            <span className="text-[color:var(--color-accent)]">Підтверджено: <strong>{approvedCount}</strong></span>
            <span className="text-[color:var(--color-text-soft)]">Вибрано: <strong>{selectedIds.size}</strong></span>
          </div>
        </div>

        <div className="rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-soft)]">Джерела</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Rozetka: <strong>{summary.rozetka}</strong></span>
            <span>Telemart: <strong>{summary.telemart}</strong></span>
            {summary.noSource > 0 && (
              <span className="text-[color:var(--color-text-soft)]">Без джерела: <strong>{summary.noSource}</strong></span>
            )}
          </div>
        </div>

        {summary.hasDeltas && (
          <div className="rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[color:var(--color-text-soft)]">Зміна цін</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>Середня: <strong>{summary.avgDelta >= 0 ? "+" : ""}{summary.avgDelta.toFixed(1)}%</strong></span>
              <span>Макс: <strong>{summary.maxDelta.toFixed(1)}%</strong></span>
              {summary.bigDrops > 0 && (
                <span className="text-red-600 dark:text-red-400">Сильне зниження: <strong>{summary.bigDrops}</strong></span>
              )}
              {summary.bigRises > 0 && (
                <span className="text-amber-600 dark:text-amber-400">Сильне зростання: <strong>{summary.bigRises}</strong></span>
              )}
            </div>
          </div>
        )}
      </div>

      {canEdit ? (
        <p className="rounded-[1rem] border border-amber-500/35 bg-amber-500/5 px-4 py-3 text-sm text-[color:var(--color-text)]">
          <strong className="text-amber-900 dark:text-amber-100">{priceUpdatesT(locale, "warnBeforeApplyTitle")}</strong>{" "}
          {priceUpdatesT(locale, "warnBeforeApplyBody")}
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="h-8 px-3 text-xs" disabled={busy} onClick={selectAll}>
              Вибрати все
            </Button>
            <Button type="button" variant="ghost" className="h-8 px-3 text-xs" disabled={busy || selectedIds.size === 0} onClick={selectNone}>
              Зняти вибір
            </Button>
            <Button type="button" variant="secondary" className="h-8 px-3 text-xs" disabled={busy || safeCount === 0} onClick={bulkApproveSafe}>
              Підтвердити безпечні ({safeCount})
            </Button>
            <Button type="button" variant="secondary" className="h-8 px-3 text-xs" disabled={busy || selectedIds.size === 0} onClick={bulkApproveSelected}>
              Підтвердити вибрані
            </Button>
            <Button type="button" variant="ghost" className="h-8 px-3 text-xs" disabled={busy || selectedIds.size === 0} onClick={bulkRejectSelected}>
              Зняти підтвердження
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={!canEdit || busy}
          onClick={saveApprovals}
        >
          {priceUpdatesT(locale, "btnSaveApprovals")}
        </Button>
        <Button
          type="button"
          disabled={!canEdit || busy || !hasApproved}
          onClick={applyApproved}
        >
          {priceUpdatesT(locale, "btnApply")}
        </Button>
      </div>
      <p className="text-xs text-[color:var(--color-text-soft)]">{priceUpdatesT(locale, "colMatchNoteHint")}</p>
      <div className="overflow-x-auto rounded-[1.2rem] border border-[color:var(--color-line-strong)]">
        <table className="w-full min-w-[1520px] border-collapse text-left text-sm">
          <thead className="bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedIds.size === lines.length && lines.length > 0}
                  onChange={(e) => e.target.checked ? selectAll() : selectNone()}
                />
              </th>
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
            {lines.map((line) => {
              const isRisky = line.lineStatus === "MANUAL_REVIEW" || line.lineStatus === "REJECTED";
              return (
                <tr
                  key={line.id}
                  className={`border-t border-[color:var(--color-line-strong)] ${isRisky ? "bg-amber-500/5" : ""}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedIds.has(line.id)}
                      onChange={() => toggleSelect(line.id)}
                    />
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
