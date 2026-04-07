"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  priceUpdatesT,
  priceUpdatesTFormat,
} from "@/lib/admin/price-updates-ui";

export function PriceUpdatePreviewStarter({ locale }: { locale: string }) {
  const router = useRouter();
  const [importSourceKey, setImportSourceKey] = useState("");
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/price-updates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importSourceKey: importSourceKey.trim() || null,
          limit,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; runId?: string; error?: string; lineCount?: number };
      if (!res.ok || !data.ok || !data.runId) {
        toast.error(data.error ?? priceUpdatesT(locale, "toastPreviewFail"));
        return;
      }
      toast.success(priceUpdatesTFormat(locale, "toastPreviewOk", String(data.lineCount ?? 0)));
      router.push(`/admin/price-updates/${data.runId}`);
      router.refresh();
    } catch {
      toast.error(priceUpdatesT(locale, "toastNetwork"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-6 flex flex-col gap-4 rounded-[1.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-5"
    >
      <h2 className="text-lg font-semibold text-[color:var(--color-text)]">
        {priceUpdatesT(locale, "newPreviewTitle")}
      </h2>
      <p className="text-sm text-[color:var(--color-text-soft)]">{priceUpdatesT(locale, "newPreviewIntro")}</p>
      <p className="text-sm font-medium text-amber-900/90 dark:text-amber-100/90">
        {priceUpdatesT(locale, "newPreviewWarn")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[color:var(--color-text)]">
            {priceUpdatesT(locale, "labelImportKey")}
          </span>
          <input
            className="rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-3 py-2 text-[color:var(--color-text)]"
            value={importSourceKey}
            onChange={(e) => setImportSourceKey(e.target.value)}
            placeholder={priceUpdatesT(locale, "placeholderImportKey")}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[color:var(--color-text)]">
            {priceUpdatesT(locale, "labelMaxProducts")}
          </span>
          <input
            type="number"
            min={1}
            max={200}
            className="rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-3 py-2 text-[color:var(--color-text)]"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? priceUpdatesT(locale, "btnRunning") : priceUpdatesT(locale, "btnRunPreview")}
        </Button>
      </div>
    </form>
  );
}
