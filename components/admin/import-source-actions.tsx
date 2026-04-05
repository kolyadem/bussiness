"use client";

import { startTransition, useState } from "react";
import { LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImportSourceActions({
  sourceId,
  locale,
  isActive,
  isSyncing,
}: {
  sourceId: string;
  locale: "uk" | "ru" | "en";
  isActive: boolean;
  isSyncing: boolean;
}) {
  const [pending, setPending] = useState<null | "toggle" | "run">(null);

  function updateSource(nextIsActive: boolean) {
    setPending("toggle");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/imports/sources/${sourceId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isActive: nextIsActive }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not update source");
        }

        toast.success(
          nextIsActive
            ? locale === "uk"
              ? "Джерело знову активне"
              : locale === "ru"
                ? "Источник снова активен"
                : "Source resumed"
            : locale === "uk"
              ? "Джерело поставлено на паузу"
              : locale === "ru"
                ? "Источник поставлен на паузу"
                : "Source paused",
        );
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update source");
      } finally {
        setPending(null);
      }
    });
  }

  function runNow() {
    setPending("run");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/imports/sources/${sourceId}/run`, {
          method: "POST",
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; jobId?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Could not run source");
        }

        toast.success(
          locale === "uk"
            ? "Запуск імпорту розпочато"
            : locale === "ru"
              ? "Запуск импорта начат"
              : "Source run started",
        );

        if (payload?.jobId) {
          window.location.assign(`/${locale}/admin/imports/${payload.jobId}`);
        } else {
          window.location.reload();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not run source");
      } finally {
        setPending(null);
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={Boolean(pending) || isSyncing}
        onClick={() => runNow()}
      >
        {pending === "run" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        <span>{locale === "uk" ? "Запустити зараз" : locale === "ru" ? "Запустить сейчас" : "Run now"}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={Boolean(pending) || isSyncing}
        onClick={() => updateSource(!isActive)}
      >
        {pending === "toggle" ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : isActive ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span>
          {isActive
            ? locale === "uk"
              ? "Пауза"
              : locale === "ru"
                ? "Пауза"
                : "Pause"
            : locale === "uk"
              ? "Відновити"
              : locale === "ru"
                ? "Возобновить"
                : "Resume"}
        </span>
      </Button>
    </div>
  );
}
