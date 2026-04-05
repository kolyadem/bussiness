"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AppLocale } from "@/lib/constants";

function getCopy(locale: AppLocale) {
  if (locale === "uk") {
    return {
      title: "Нотатка менеджера",
      description: "Внутрішня примітка для обробки заявки. Клієнт її не бачить.",
      placeholder: "Наприклад: зателефонувати після 18:00, запропонувати два сценарії під бюджет, уточнити апгрейд.",
      save: "Зберегти",
      success: "Нотатку оновлено",
      error: "Не вдалося зберегти нотатку",
    };
  }

  if (locale === "ru") {
    return {
      title: "Заметка менеджера",
      description: "Внутренняя заметка для обработки заявки. Клиент ее не видит.",
      placeholder: "Например: позвонить после 18:00, предложить два сценария под бюджет, уточнить апгрейд.",
      save: "Сохранить",
      success: "Заметка обновлена",
      error: "Не удалось сохранить заметку",
    };
  }

  return {
    title: "Manager note",
    description: "Internal note for the admin workflow. The client never sees it.",
    placeholder: "For example: call after 6 PM, prepare two options within budget, clarify the upgrade path.",
    save: "Save",
    success: "Manager note updated",
    error: "Could not save the note",
  };
}

export function BuildRequestManagerNote({
  requestId,
  locale,
  initialValue,
}: {
  requestId: string;
  locale: AppLocale;
  initialValue: string;
}) {
  const copy = getCopy(locale);
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.title}</h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{copy.description}</p>
      </div>

      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={copy.placeholder}
        rows={7}
        maxLength={2000}
        className="w-full rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm leading-7 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
      />

      <Button
        type="button"
        variant="secondary"
        disabled={pending || value === initialValue}
        onClick={() => {
          setPending(true);

          startTransition(async () => {
            try {
              const response = await fetch(`/api/admin/build-requests/${requestId}/note`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ managerNote: value }),
              });

              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as { error?: string } | null;
                throw new Error(payload?.error || copy.error);
              }

              toast.success(copy.success);
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : copy.error);
            } finally {
              setPending(false);
            }
          });
        }}
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        <span>{copy.save}</span>
      </Button>
    </div>
  );
}
