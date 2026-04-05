"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { priceUpdatesT } from "@/lib/admin/price-updates-ui";

export type RollbackRow = {
  id: string;
  appliedAt: string;
  productSku: string;
  previousPriceDisplay: string;
  newPriceDisplay: string;
};

export function PriceRollbackList({ rows, locale }: { rows: RollbackRow[]; locale: string }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function rollback(id: string) {
    if (!confirm(priceUpdatesT(locale, "rollbackConfirm"))) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/price-updates/history/${id}/rollback`, {
        method: "POST",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? priceUpdatesT(locale, "rollbackToastFail"));
        return;
      }
      toast.success(priceUpdatesT(locale, "rollbackToastOk"));
      router.refresh();
    } catch {
      toast.error(priceUpdatesT(locale, "toastNetwork"));
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-[color:var(--color-text-soft)]">{priceUpdatesT(locale, "rollbackEmpty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[1.2rem] border border-[color:var(--color-line-strong)]">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]">
          <tr>
            <th className="p-3">{priceUpdatesT(locale, "thArticle")}</th>
            <th className="p-3">{priceUpdatesT(locale, "rollbackThApplied")}</th>
            <th className="p-3">{priceUpdatesT(locale, "rollbackThWas")}</th>
            <th className="p-3">{priceUpdatesT(locale, "rollbackThBecame")}</th>
            <th className="p-3">{priceUpdatesT(locale, "rollbackThAction")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[color:var(--color-line-strong)] text-[color:var(--color-text)]">
              <td className="p-3 font-mono text-xs">{r.productSku}</td>
              <td className="p-3 text-xs">
                {new Date(r.appliedAt).toLocaleString(locale === "uk" ? "uk-UA" : locale === "ru" ? "ru-RU" : "en-US")}
              </td>
              <td className="p-3">{r.previousPriceDisplay}</td>
              <td className="p-3">{r.newPriceDisplay}</td>
              <td className="p-3">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => rollback(r.id)}
                  className="text-sm font-semibold text-red-600 disabled:opacity-50"
                >
                  {busyId === r.id ? priceUpdatesT(locale, "rollbackBusy") : priceUpdatesT(locale, "rollbackBtn")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
