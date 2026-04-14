"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";

const copy = {
  label: "Промокод",
  placeholder: "Введіть код",
  apply: "Застосувати",
  remove: "Прибрати",
  applying: "Застосування…",
  success: "Промокод застосовано",
};

export function CheckoutPromoField({
  locale,
  initialCode,
  effectDescription,
}: {
  locale: AppLocale;
  /** Відображуваний код активного промокоду (якщо є) */
  initialCode?: string | null;
  /** Короткий опис ефекту з сервера (наприклад «Знижка 10%») */
  effectDescription?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/cart/promo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            code: code.trim(),
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; alreadyApplied?: boolean }
          | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Не вдалося застосувати промокод");
        }

        if (payload.alreadyApplied) {
          setInfo(copy.success);
        } else {
          setInfo(copy.success);
          setCode("");
        }

        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Помилка");
      }
    });
  };

  const remove = () => {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/cart/promo", {
          method: "DELETE",
        });

        const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Не вдалося скинути промокод");
        }

        setCode("");
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Помилка");
      }
    });
  };

  const hasApplied = Boolean(initialCode);

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.label}</p>
      {hasApplied ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 rounded-[1rem] border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            <p>
              {copy.success}: <span className="font-medium">{initialCode}</span>
            </p>
            {effectDescription ? (
              <p className="mt-1 text-xs leading-5 text-emerald-800/90 dark:text-emerald-200/90">{effectDescription}</p>
            ) : null}
          </div>
          <Button type="button" variant="secondary" className="h-10 shrink-0" disabled={pending} onClick={remove}>
            {pending ? copy.applying : copy.remove}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={copy.placeholder}
            className="h-11 min-w-0 flex-1 rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            autoComplete="off"
          />
          <Button type="button" className="h-11 shrink-0 sm:min-w-[9rem]" disabled={pending || code.trim().length < 2} onClick={apply}>
            {pending ? copy.applying : copy.apply}
          </Button>
        </div>
      )}
      {error ? (
        <p className="rounded-[1rem] border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
          {error}
        </p>
      ) : null}
      {info && !hasApplied ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-300">{info}</p>
      ) : null}
    </div>
  );
}
