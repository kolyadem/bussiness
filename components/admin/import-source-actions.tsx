"use client";

import { startTransition, useState } from "react";
import { LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";

export function ImportSourceActions({
  sourceId,
  locale: _locale,
  isActive,
  isSyncing,
}: {
  sourceId: string;
  locale: AppLocale;
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
          throw new Error(payload?.error || "Не вдалося оновити джерело");
        }

        toast.success(
          nextIsActive ? "Джерело знову активне" : "Джерело поставлено на паузу",
        );
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося оновити джерело");
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

        toast.success("Запуск імпорту розпочато");

        if (payload?.jobId) {
          window.location.assign(`/admin/imports/${payload.jobId}`);
        } else {
          window.location.reload();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося запустити джерело");
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
        <span>Запустити зараз</span>
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
        <span>{isActive ? "Пауза" : "Відновити"}</span>
      </Button>
    </div>
  );
}
