"use client";

import { useActionState, useState } from "react";
import { defaultLocale } from "@/lib/constants";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";

type BannerTranslationFields = {
  title: string;
  subtitle: string;
  ctaLabel: string;
};

type EntityState = {
  status: "idle" | "error";
  message?: string;
};

type EntityAction = (state: EntityState, formData: FormData) => Promise<EntityState>;

const COPY = {
  title: "Параметри банера",
  key: "Ключ",
  type: "Тип",
  sortOrder: "Порядок",
  href: "Href",
  active: "Банер активний",
  image: "Зображення банера",
  imageHint: "Можна залишити порожнім, якщо хочете зберегти поточне зображення.",
  name: "Заголовок",
  subtitle: "Підзаголовок",
  ctaLabel: "Підпис кнопки",
  hero: "Hero",
  promo: "Promo",
  save: "Зберегти банер",
  saving: "Збереження...",
};

export function AdminBannerForm({
  locale,
  action,
  initialValues,
}: {
  locale: string;
  action: EntityAction;
  initialValues?: {
    key: string;
    type: string;
    href: string;
    isActive: boolean;
    sortOrder: number;
    image: string;
    translations: BannerTranslationFields;
  };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const [translations, setTranslations] = useState<BannerTranslationFields>(
    initialValues?.translations ?? {
      title: "",
      subtitle: "",
      ctaLabel: "",
    },
  );

  const updateTranslation = (field: keyof BannerTranslationFields, value: string) => {
    setTranslations((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="imageCurrent" value={initialValues?.image ?? ""} />

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{COPY.title}</h2>
          <AdminSubmitButton pendingLabel={COPY.saving}>{COPY.save}</AdminSubmitButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.key}</span>
            <input
              name="key"
              defaultValue={initialValues?.key ?? ""}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.type}</span>
            <select
              name="type"
              defaultValue={initialValues?.type ?? "PROMO"}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="HERO">{COPY.hero}</option>
              <option value="PROMO">{COPY.promo}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.sortOrder}</span>
            <input
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={initialValues?.sortOrder ?? 0}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
            <span>{COPY.href}</span>
            <input
              name="href"
              defaultValue={initialValues?.href ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)]">
            <input name="isActive" type="checkbox" defaultChecked={initialValues?.isActive ?? true} />
            <span>{COPY.active}</span>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          {initialValues?.image ? (
            <ProductImageFrame
              src={initialValues.image}
              alt={COPY.image}
              className="bg-white/90 shadow-none"
            />
          ) : (
            <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)]" />
          )}
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.image}</span>
            <input
              name="imageFile"
              type="file"
              accept="image/*"
              className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{COPY.imageHint}</span>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.name}</span>
            <input
              name={`title:${defaultLocale}`}
              value={translations.title}
              onChange={(event) => updateTranslation("title", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.subtitle}</span>
            <textarea
              name={`subtitle:${defaultLocale}`}
              value={translations.subtitle}
              onChange={(event) => updateTranslation("subtitle", event.target.value)}
              className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.ctaLabel}</span>
            <input
              name={`ctaLabel:${defaultLocale}`}
              value={translations.ctaLabel}
              onChange={(event) => updateTranslation("ctaLabel", event.target.value)}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>
      </section>

      {state.message ? (
        <p className="rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
