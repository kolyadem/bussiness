"use client";

import { startTransition, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";

export function ImportRerunButton({
  jobId,
  locale: _locale,
}: {
  jobId: string;
  locale: AppLocale;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={() => {
        setPending(true);

        startTransition(async () => {
          try {
            const response = await fetch(`/api/admin/imports/${jobId}/rerun`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ dryRun: false }),
            });
            const payload = (await response.json().catch(() => null)) as
              | { error?: string; jobId?: string }
              | null;

            if (!response.ok) {
              throw new Error(payload?.error || "Не вдалося повторити імпорт");
            }

            toast.success("Повторний запуск імпорту розпочато");

            if (payload?.jobId) {
              window.location.assign(`/admin/imports/${payload.jobId}`);
            } else {
              window.location.reload();
            }
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Не вдалося перезапустити імпорт",
            );
          } finally {
            setPending(false);
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
      <span>Повторити імпорт</span>
    </Button>
  );
}
