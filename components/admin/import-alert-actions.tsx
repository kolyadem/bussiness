"use client";

import { startTransition, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImportAlertActions({
  alertId,
  locale,
  status,
  disabled,
}: {
  alertId: string;
  locale: "uk" | "ru" | "en";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const alreadyAcknowledged = status === "ACKNOWLEDGED";

  return (
    <Button
      type="button"
      variant="ghost"
      disabled={disabled || pending || alreadyAcknowledged}
      onClick={() => {
        setPending(true);

        startTransition(async () => {
          try {
            const response = await fetch(`/api/admin/imports/alerts/${alertId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ action: "acknowledge" }),
            });
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;

            if (!response.ok) {
              throw new Error(payload?.error || "Could not acknowledge alert");
            }

            toast.success(
              locale === "uk"
                ? "Сигнал підтверджено"
                : locale === "ru"
                  ? "Сигнал подтверждён"
                  : "Alert acknowledged",
            );
            window.location.reload();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not acknowledge alert");
          } finally {
            setPending(false);
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      <span>
        {alreadyAcknowledged
          ? locale === "uk"
            ? "Підтверджено"
            : locale === "ru"
              ? "Подтверждено"
              : "Acknowledged"
          : locale === "uk"
            ? "Підтвердити"
            : locale === "ru"
              ? "Подтвердить"
              : "Acknowledge"}
      </span>
    </Button>
  );
}
