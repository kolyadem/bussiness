"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";

export function ListRemoveButton({
  endpoint,
  productId,
  compact = false,
}: {
  endpoint: "/api/wishlist" | "/api/compare";
  productId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [pending, setPending] = useState(false);

  const label = locale === "uk" ? "Видалити" : locale === "ru" ? "Удалить" : "Remove";
  const successLabel =
    endpoint === "/api/wishlist"
      ? locale === "uk"
        ? "Товар прибрано з обраного"
        : locale === "ru"
          ? "Товар убран из избранного"
          : "Removed from wishlist"
      : locale === "uk"
        ? "Товар прибрано з порівняння"
        : locale === "ru"
          ? "Товар убран из сравнения"
          : "Removed from compare";

  return (
    <button
      type="button"
      onClick={() => {
        setPending(true);

        startTransition(async () => {
          try {
            const response = await fetch(endpoint, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productId }),
            });

            if (!response.ok) {
              const payload = await readApiPayload(response);
              throw new Error(payload.error || "Request failed");
            }

            toast.success(successLabel);
            router.refresh();
          } catch {
            toast.error(getActionErrorMessage(locale));
          } finally {
            setPending(false);
          }
        });
      }}
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] text-sm font-medium text-[color:var(--color-text-soft)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 ${
        compact ? "h-9 px-3" : "h-10 px-4"
      }`}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {compact ? null : <span>{label}</span>}
    </button>
  );
}
