"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";

async function request(method: "PATCH" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch("/api/cart", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await readApiPayload(response);
    throw new Error(payload.error || "Запит не вдався");
  }

  return readApiPayload(response);
}

export function CartQuantityControl({
  itemId,
  quantity,
}: {
  itemId: string;
  quantity: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [displayQuantity, setDisplayQuantity] = useState(quantity);
  const removedMessage = "Товар прибрано з кошика";

  useEffect(() => {
    setDisplayQuantity(quantity);
  }, [quantity]);

  const update = (nextQuantity: number) => {
    if (pending) {
      return;
    }

    setDisplayQuantity(Math.max(0, nextQuantity));
    setPending(true);

    startTransition(async () => {
      try {
        if (nextQuantity <= 0) {
          await request("DELETE", { itemId });
          toast.success(removedMessage);
        } else {
          await request("PATCH", { itemId, quantity: nextQuantity });
        }

        router.refresh();
      } catch {
        setDisplayQuantity(quantity);
        toast.error(getActionErrorMessage("uk"));
      } finally {
        setPending(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => update(displayQuantity - 1)}
        disabled={pending}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
      </button>
      <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 text-center text-sm font-semibold text-[color:var(--color-text)]">
        {displayQuantity}
      </span>
      <button
        type="button"
        onClick={() => update(displayQuantity + 1)}
        disabled={pending}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={() => update(0)}
        disabled={pending}
        className="ml-2 flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)] outline-none transition duration-200 ease-out hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400/40 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 dark:hover:text-rose-200"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
