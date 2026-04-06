"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";
import {
  getOrderStatusLabel,
  ORDER_STATUSES,
  type OrderStatus,
} from "@/lib/storefront/orders";

export function OrderStatusControl({
  orderId,
  locale,
  value,
  managerNote = "",
  showNote = false,
  compact = false,
}: {
  orderId: string;
  locale: AppLocale;
  value: OrderStatus;
  managerNote?: string | null;
  showNote?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(value);
  const [note, setNote] = useState(managerNote ?? "");
  const [pending, setPending] = useState(false);

  return (
    <div className={compact ? "grid gap-2" : "grid gap-3"}>
      <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"}>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          disabled={pending}
        >
          {ORDER_STATUSES.map((option) => (
            <option key={option} value={option}>
              {getOrderStatusLabel(option, locale)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || (status === value && note === (managerNote ?? ""))}
          onClick={() => {
            setPending(true);

            startTransition(async () => {
              try {
                const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status, managerNote: note }),
                });

                if (!response.ok) {
                  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                  throw new Error(payload?.error || "Не вдалося оновити замовлення");
                }

                toast.success("Замовлення оновлено");
                router.refresh();
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Не вдалося оновити замовлення",
                );
              } finally {
                setPending(false);
              }
            });
          }}
          className={compact ? "w-full" : undefined}
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          <span>Зберегти</span>
        </Button>
      </div>

      {showNote ? (
        <label className="grid gap-2">
          <span className="text-sm text-[color:var(--color-text-soft)]">
            Нотатка менеджера
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            disabled={pending}
            placeholder="Внутрішня примітка по замовленню"
            className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          />
        </label>
      ) : null}
    </div>
  );
}
