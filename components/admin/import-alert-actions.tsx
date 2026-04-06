"use client";

import { startTransition, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";

export function ImportAlertActions({
  alertId,
  locale: _locale,
  status,
  disabled,
}: {
  alertId: string;
  locale: AppLocale;
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
              throw new Error(payload?.error || "Не вдалося підтвердити сигнал");
            }

            toast.success("Сигнал підтверджено");
            window.location.reload();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Не вдалося підтвердити сигнал");
          } finally {
            setPending(false);
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      <span>
        {alreadyAcknowledged ? "Підтверджено" : "Підтвердити"}
      </span>
    </Button>
  );
}
