"use client";

import { startTransition, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";
import {
  BUILD_REQUEST_STATUSES,
  getBuildRequestStatusLabel,
  type BuildRequestStatus,
} from "@/lib/storefront/build-requests";

export function BuildRequestStatusControl({
  requestId,
  locale,
  value,
}: {
  requestId: string;
  locale: AppLocale;
  value: BuildRequestStatus;
}) {
  const [status, setStatus] = useState<BuildRequestStatus>(value);
  const [pending, setPending] = useState(false);

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as BuildRequestStatus)}
        className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
        disabled={pending}
      >
        {BUILD_REQUEST_STATUSES.map((option) => (
          <option key={option} value={option}>
            {getBuildRequestStatusLabel(option, locale)}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        disabled={pending || status === value}
        onClick={() => {
          setPending(true);

          startTransition(async () => {
            try {
              const response = await fetch(`/api/admin/build-requests/${requestId}/status`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
              });

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || "Не вдалося оновити заявку");
              }

              toast.success("Статус заявки оновлено");
              window.location.reload();
            } catch {
              toast.error("Не вдалося змінити статус");
            } finally {
              setPending(false);
            }
          });
        }}
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        <span>Зберегти</span>
      </Button>
    </div>
  );
}
