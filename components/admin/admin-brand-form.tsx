"use client";

import { useActionState, useState } from "react";
import { locales, type AppLocale } from "@/lib/constants";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";

type BrandTranslations = Record<
  AppLocale,
  {
    name: string;
    summary: string;
  }
>;

type EntityState = {
  status: "idle" | "error";
  message?: string;
};

type EntityAction = (state: EntityState, formData: FormData) => Promise<EntityState>;

export function AdminBrandForm({
  locale,
  action,
  initialValues,
}: {
  locale: string;
  action: EntityAction;
  initialValues?: {
    slug: string;
    logo: string;
    website: string;
    sortOrder: number;
    translations: BrandTranslations;
  };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const [activeLocale, setActiveLocale] = useState<AppLocale>("uk");
  const [translations, setTranslations] = useState<BrandTranslations>(
    initialValues?.translations ?? {
      uk: { name: "", summary: "" },
      ru: { name: "", summary: "" },
      en: { name: "", summary: "" },
    },
  );
  const copy = {
    title: locale === "uk" ? "Параметри бренду" : locale === "ru" ? "Параметры бренда" : "Brand settings",
    slug: "Slug",
    sortOrder: locale === "uk" ? "Порядок" : locale === "ru" ? "Порядок" : "Sort order",
    logo: locale === "uk" ? "Логотип" : locale === "ru" ? "Логотип" : "Logo",
    logoHint:
      locale === "uk"
        ? "Необов'язкове посилання на логотип бренду."
        : locale === "ru"
          ? "Необязательная ссылка на логотип бренда."
          : "Optional logo URL.",
    website: locale === "uk" ? "Сайт" : locale === "ru" ? "Сайт" : "Website",
    name: locale === "uk" ? "Назва" : locale === "ru" ? "Название" : "Name",
    summary: locale === "uk" ? "Короткий опис" : locale === "ru" ? "Краткое описание" : "Summary",
    save: locale === "uk" ? "Зберегти бренд" : locale === "ru" ? "Сохранить бренд" : "Save brand",
    saving: locale === "uk" ? "Збереження..." : locale === "ru" ? "Сохранение..." : "Saving...",
  };

  const updateTranslation = (
    targetLocale: AppLocale,
    field: keyof BrandTranslations[AppLocale],
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

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{copy.title}</h2>
          <AdminSubmitButton pendingLabel={copy.saving}>{copy.save}</AdminSubmitButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.slug}</span>
            <input
              name="slug"
              defaultValue={initialValues?.slug ?? ""}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
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
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.logo}</span>
            <input
              name="logo"
              defaultValue={initialValues?.logo ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{copy.logoHint}</span>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.website}</span>
            <input
              name="website"
              defaultValue={initialValues?.website ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
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
              name={`name:${activeLocale}`}
              value={translations[activeLocale].name}
              onChange={(event) => updateTranslation(activeLocale, "name", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.summary}</span>
            <textarea
              name={`summary:${activeLocale}`}
              value={translations[activeLocale].summary}
              onChange={(event) => updateTranslation(activeLocale, "summary", event.target.value)}
              className="min-h-28 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>

        {locales
          .filter((tabLocale) => tabLocale !== activeLocale)
          .map((hiddenLocale) => (
            <div key={hiddenLocale} className="hidden">
              <input name={`name:${hiddenLocale}`} value={translations[hiddenLocale].name} readOnly />
              <textarea name={`summary:${hiddenLocale}`} value={translations[hiddenLocale].summary} readOnly />
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
