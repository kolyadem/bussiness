"use client";

import { useActionState, useState } from "react";
import { locales, type AppLocale } from "@/lib/constants";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";

type BannerTranslations = Record<
  AppLocale,
  {
    title: string;
    subtitle: string;
    ctaLabel: string;
  }
>;

type EntityState = {
  status: "idle" | "error";
  message?: string;
};

type EntityAction = (state: EntityState, formData: FormData) => Promise<EntityState>;

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
    translations: BannerTranslations;
  };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const [activeLocale, setActiveLocale] = useState<AppLocale>("uk");
  const [translations, setTranslations] = useState<BannerTranslations>(
    initialValues?.translations ?? {
      uk: { title: "", subtitle: "", ctaLabel: "" },
      ru: { title: "", subtitle: "", ctaLabel: "" },
      en: { title: "", subtitle: "", ctaLabel: "" },
    },
  );
  const copy = {
    title: locale === "uk" ? "Параметри банера" : locale === "ru" ? "Параметры баннера" : "Banner settings",
    key: locale === "uk" ? "Ключ" : locale === "ru" ? "Ключ" : "Key",
    type: locale === "uk" ? "Тип" : locale === "ru" ? "Тип" : "Type",
    sortOrder: locale === "uk" ? "Порядок" : locale === "ru" ? "Порядок" : "Sort order",
    href: "Href",
    active: locale === "uk" ? "Банер активний" : locale === "ru" ? "Баннер активен" : "Banner is active",
    image: locale === "uk" ? "Зображення банера" : locale === "ru" ? "Изображение баннера" : "Banner image",
    imageHint:
      locale === "uk"
        ? "Можна залишити порожнім, якщо хочете зберегти поточне зображення."
        : locale === "ru"
          ? "Можно оставить пустым, если нужно сохранить текущее изображение."
          : "Leave empty to keep the current image.",
    name: locale === "uk" ? "Заголовок" : locale === "ru" ? "Заголовок" : "Title",
    subtitle: locale === "uk" ? "Підзаголовок" : locale === "ru" ? "Подзаголовок" : "Subtitle",
    ctaLabel: locale === "uk" ? "Підпис кнопки" : locale === "ru" ? "Подпись кнопки" : "CTA label",
    hero: "Hero",
    promo: "Promo",
    save: locale === "uk" ? "Зберегти банер" : locale === "ru" ? "Сохранить баннер" : "Save banner",
    saving: locale === "uk" ? "Збереження..." : locale === "ru" ? "Сохранение..." : "Saving...",
  };

  const updateTranslation = (
    targetLocale: AppLocale,
    field: keyof BannerTranslations[AppLocale],
    value: string,
  ) => {
    setTranslations((current) => ({
      ...current,
      [targetLocale]: {
        ...current[targetLocale],
        [field]: value,
      },
    }));
  };

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="imageCurrent" value={initialValues?.image ?? ""} />

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h2>
          <AdminSubmitButton pendingLabel={copy.saving}>{copy.save}</AdminSubmitButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.key}</span>
            <input
              name="key"
              defaultValue={initialValues?.key ?? ""}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.type}</span>
            <select
              name="type"
              defaultValue={initialValues?.type ?? "PROMO"}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="HERO">{copy.hero}</option>
              <option value="PROMO">{copy.promo}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.sortOrder}</span>
            <input
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={initialValues?.sortOrder ?? 0}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)] md:col-span-2">
            <span>{copy.href}</span>
            <input
              name="href"
              defaultValue={initialValues?.href ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="flex items-center gap-3 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)]">
            <input name="isActive" type="checkbox" defaultChecked={initialValues?.isActive ?? true} />
            <span>{copy.active}</span>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
          {initialValues?.image ? (
            <ProductImageFrame
              src={initialValues.image}
              alt={copy.image}
              className="bg-white/90 shadow-none"
            />
          ) : (
            <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)]" />
          )}
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.image}</span>
            <input
              name="imageFile"
              type="file"
              accept="image/*"
              className="rounded-[1rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4 text-[color:var(--color-text-soft)]"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.imageHint}</span>
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap gap-2">
          {locales.map((tabLocale) => (
            <button
              key={tabLocale}
              type="button"
              onClick={() => setActiveLocale(tabLocale)}
              className={
                activeLocale === tabLocale
                  ? "rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)]"
                  : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-2 text-sm text-[color:var(--color-text-soft)]"
              }
            >
              {tabLocale.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.name}</span>
            <input
              name={`title:${activeLocale}`}
              value={translations[activeLocale].title}
              onChange={(event) => updateTranslation(activeLocale, "title", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.subtitle}</span>
            <textarea
              name={`subtitle:${activeLocale}`}
              value={translations[activeLocale].subtitle}
              onChange={(event) => updateTranslation(activeLocale, "subtitle", event.target.value)}
              className="min-h-24 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.ctaLabel}</span>
            <input
              name={`ctaLabel:${activeLocale}`}
              value={translations[activeLocale].ctaLabel}
              onChange={(event) => updateTranslation(activeLocale, "ctaLabel", event.target.value)}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>

        {locales
          .filter((tabLocale) => tabLocale !== activeLocale)
          .map((hiddenLocale) => (
            <div key={hiddenLocale} className="hidden">
              <input name={`title:${hiddenLocale}`} value={translations[hiddenLocale].title} readOnly />
              <textarea name={`subtitle:${hiddenLocale}`} value={translations[hiddenLocale].subtitle} readOnly />
              <input
                name={`ctaLabel:${hiddenLocale}`}
                value={translations[hiddenLocale].ctaLabel}
                readOnly
              />
            </div>
          ))}
      </section>

      {state.message ? (
        <p className="rounded-[1.2rem] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-300">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
