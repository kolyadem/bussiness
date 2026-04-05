"use client";

import { useActionState, useState } from "react";
import type { Category } from "@prisma/client";
import { locales, type AppLocale } from "@/lib/constants";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";

type CategoryTranslations = Record<
  AppLocale,
  {
    name: string;
    description: string;
  }
>;

type EntityState = {
  status: "idle" | "error";
  message?: string;
};

type EntityAction = (state: EntityState, formData: FormData) => Promise<EntityState>;

export function AdminCategoryForm({
  locale,
  action,
  categories,
  currentCategoryId,
  initialValues,
}: {
  locale: string;
  action: EntityAction;
  categories: Array<
    Category & {
      translations: Array<{
        locale: string;
        name: string;
      }>;
    }
  >;
  currentCategoryId?: string;
  initialValues?: {
    slug: string;
    parentId: string | null;
    image: string;
    sortOrder: number;
    translations: CategoryTranslations;
  };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const [activeLocale, setActiveLocale] = useState<AppLocale>("uk");
  const [translations, setTranslations] = useState<CategoryTranslations>(
    initialValues?.translations ?? {
      uk: { name: "", description: "" },
      ru: { name: "", description: "" },
      en: { name: "", description: "" },
    },
  );
  const copy = {
    title:
      locale === "uk"
        ? "Параметри категорії"
        : locale === "ru"
          ? "Параметры категории"
          : "Category settings",
    slug: "Slug",
    sortOrder: locale === "uk" ? "Порядок" : locale === "ru" ? "Порядок" : "Sort order",
    parentCategory:
      locale === "uk"
        ? "Батьківська категорія"
        : locale === "ru"
          ? "Родительская категория"
          : "Parent category",
    noParent:
      locale === "uk"
        ? "Без батьківської категорії"
        : locale === "ru"
          ? "Без родительской категории"
          : "No parent category",
    image: locale === "uk" ? "Зображення" : locale === "ru" ? "Изображение" : "Image",
    imageHint:
      locale === "uk"
        ? "Необов'язкове посилання на зображення категорії."
        : locale === "ru"
          ? "Необязательная ссылка на изображение категории."
          : "Optional URL for the category image.",
    name: locale === "uk" ? "Назва" : locale === "ru" ? "Название" : "Name",
    description: locale === "uk" ? "Опис" : locale === "ru" ? "Описание" : "Description",
    save:
      locale === "uk"
        ? "Зберегти категорію"
        : locale === "ru"
          ? "Сохранить категорию"
          : "Save category",
    saving: locale === "uk" ? "Збереження..." : locale === "ru" ? "Сохранение..." : "Saving...",
  };

  const updateTranslation = (
    targetLocale: AppLocale,
    field: keyof CategoryTranslations[AppLocale],
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

  const optionLabel = (category: (typeof categories)[number]) => {
    const localized =
      category.translations.find((item) => item.locale === locale)?.name ??
      category.translations[0]?.name ??
      category.slug;

    if (!category.parentId) {
      return localized;
    }

    const parent = categories.find((item) => item.id === category.parentId);
    const parentLabel =
      parent?.translations.find((item) => item.locale === locale)?.name ??
      parent?.translations[0]?.name ??
      "";

    return parentLabel ? `${parentLabel} / ${localized}` : localized;
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
            <span>{copy.parentCategory}</span>
            <select
              name="parentId"
              defaultValue={initialValues?.parentId ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="">{copy.noParent}</option>
              {categories
                .filter((category) => category.id !== currentCategoryId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {optionLabel(category)}
                  </option>
                ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.image}</span>
            <input
              name="image"
              defaultValue={initialValues?.image ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
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
              name={`name:${activeLocale}`}
              value={translations[activeLocale].name}
              onChange={(event) => updateTranslation(activeLocale, "name", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.description}</span>
            <textarea
              name={`description:${activeLocale}`}
              value={translations[activeLocale].description}
              onChange={(event) => updateTranslation(activeLocale, "description", event.target.value)}
              className="min-h-28 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
            />
          </label>
        </div>

        {locales
          .filter((tabLocale) => tabLocale !== activeLocale)
          .map((hiddenLocale) => (
            <div key={hiddenLocale} className="hidden">
              <input name={`name:${hiddenLocale}`} value={translations[hiddenLocale].name} readOnly />
              <textarea
                name={`description:${hiddenLocale}`}
                value={translations[hiddenLocale].description}
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
