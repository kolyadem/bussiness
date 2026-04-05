"use client";

import { startTransition, useState } from "react";
import { LoaderCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImportRerunButton({
  jobId,
  locale,
}: {
  jobId: string;
  locale: "uk" | "ru" | "en";
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
              throw new Error(payload?.error || "Could not rerun import");
            }

            toast.success(
              locale === "uk"
                ? "Повторний запуск імпорту розпочато"
                : locale === "ru"
                  ? "Повторный запуск импорта начат"
                  : "Import re-run started",
            );

            if (payload?.jobId) {
              window.location.assign(`/${locale}/admin/imports/${payload.jobId}`);
            } else {
              window.location.reload();
            }
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : locale === "uk"
                  ? "Не вдалося перезапустити імпорт"
                  : locale === "ru"
                    ? "Не удалось перезапустить импорт"
                    : "Could not rerun import",
            );
          } finally {
            setPending(false);
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
      <span>{locale === "uk" ? "Повторити імпорт" : locale === "ru" ? "Повторить импорт" : "Re-run import"}</span>
    </Button>
  );
}
