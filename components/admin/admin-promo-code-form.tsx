"use client";

import { useActionState } from "react";
import { PromoCodeType } from "@prisma/client";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";

/** Вирівняно з `EntityFormState` у `app/actions/admin.ts` */
type FormState = {
  status: "idle" | "error";
  message?: string;
};

const copy = {
  code: "Код промокоду",
  title: "Назва (внутрішня)",
  description: "Опис",
  type: "Тип",
  value: "Значення",
  valueHintPercent: "Відсоток знижки на суму комплектуючих (1–100).",
  valueHintFixed: "Сума знижки в копійках.",
  valueHintFree: "Для цього типу значення не використовується.",
  active: "Активний",
  usageLimit: "Ліміт використань",
  usageLimitHint: "Залиште порожнім для необмеженої кількості.",
  validFrom: "Дійний з",
  validUntil: "Дійний до",
  save: "Зберегти",
  saving: "Збереження...",
};

const TYPE_LABELS: Record<PromoCodeType, string> = {
  PERCENT_DISCOUNT: "Знижка у відсотках",
  FIXED_DISCOUNT: "Фіксована знижка",
  FREE_BUILD: "Безкоштовна збірка",
};

function formatDatetimeLocal(value: Date | null | undefined) {
  if (!value) {
    return "";
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function AdminPromoCodeForm({
  locale,
  action,
  mode,
  promoId,
  initialValues,
}: {
  locale: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  mode: "create" | "edit";
  promoId?: string;
  initialValues?: {
    code: string;
    title: string;
    description: string;
    type: PromoCodeType;
    value: number;
    isActive: boolean;
    usageLimit: number | null;
    validFrom: Date | null;
    validUntil: Date | null;
  };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {mode === "edit" && promoId ? <input type="hidden" name="id" value={promoId} /> : null}

      {state.status === "error" && state.message ? (
        <p className="rounded-[1.2rem] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
          <span>{copy.code}</span>
          <input
            name="code"
            required
            minLength={2}
            maxLength={40}
            defaultValue={initialValues?.code ?? ""}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
          <span>{copy.title}</span>
          <input
            name="title"
            required
            defaultValue={initialValues?.title ?? ""}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
          <span>{copy.description}</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={initialValues?.description ?? ""}
            className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
          <span>{copy.type}</span>
          <select
            name="type"
            defaultValue={initialValues?.type ?? "PERCENT_DISCOUNT"}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          >
            {(Object.keys(TYPE_LABELS) as PromoCodeType[]).map((key) => (
              <option key={key} value={key}>
                {TYPE_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
          <span>{copy.value}</span>
          <input
            name="value"
            type="number"
            min={0}
            defaultValue={initialValues?.value ?? 10}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          />
          <span className="text-xs leading-5 text-[color:var(--color-text-soft)]">
            {copy.valueHintPercent} {copy.valueHintFixed} {copy.valueHintFree}
          </span>
        </label>
        <label className="flex items-center gap-3 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={initialValues?.isActive ?? true}
            className="h-4 w-4 rounded border-[color:var(--color-line)]"
          />
          {copy.active}
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
          <span>{copy.usageLimit}</span>
          <input
            name="usageLimit"
            type="number"
            min={1}
            placeholder="—"
            defaultValue={initialValues?.usageLimit ?? ""}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          />
          <span className="text-xs leading-5 text-[color:var(--color-text-soft)]">{copy.usageLimitHint}</span>
        </label>
        <div className="md:col-span-2" />
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
          <span>{copy.validFrom}</span>
          <input
            name="validFrom"
            type="datetime-local"
            defaultValue={formatDatetimeLocal(initialValues?.validFrom ?? null)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          />
        </label>
        <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
          <span>{copy.validUntil}</span>
          <input
            name="validUntil"
            type="datetime-local"
            defaultValue={formatDatetimeLocal(initialValues?.validUntil ?? null)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
          />
        </label>
      </div>

      <AdminSubmitButton pendingLabel={copy.saving}>{copy.save}</AdminSubmitButton>
    </form>
  );
}
