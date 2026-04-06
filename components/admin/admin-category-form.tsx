"use client";

import { useActionState, useState } from "react";
import type { Category } from "@prisma/client";
import { defaultLocale } from "@/lib/constants";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";

type CategoryTranslationFields = {
  name: string;
  description: string;
};

type EntityState = {
  status: "idle" | "error";
  message?: string;
};

type EntityAction = (state: EntityState, formData: FormData) => Promise<EntityState>;

const COPY = {
  title: "Параметри категорії",
  slug: "Slug",
  sortOrder: "Порядок",
  parentCategory: "Батьківська категорія",
  noParent: "Без батьківської категорії",
  image: "Зображення",
  imageHint: "Необов'язкове посилання на зображення категорії.",
  slugHint: "Можна залишити порожнім — згенерується з назви.",
  name: "Назва",
  description: "Опис",
  save: "Зберегти категорію",
  saving: "Збереження...",
};

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
    translations: CategoryTranslationFields;
  };
}) {
  const [state, formAction] = useActionState(action, { status: "idle" });
  const [translations, setTranslations] = useState<CategoryTranslationFields>(
    initialValues?.translations ?? {
      name: "",
      description: "",
    },
  );

  const updateTranslation = (field: keyof CategoryTranslationFields, value: string) => {
    setTranslations((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const optionLabel = (category: (typeof categories)[number]) => {
    const localized =
      category.translations.find((item) => item.locale === defaultLocale)?.name ??
      category.translations[0]?.name ??
      category.slug;

    if (!category.parentId) {
      return localized;
    }

    const parent = categories.find((item) => item.id === category.parentId);
    const parentLabel =
      parent?.translations.find((item) => item.locale === defaultLocale)?.name ??
      parent?.translations[0]?.name ??
      "";

    return parentLabel ? `${parentLabel} / ${localized}` : localized;
  };

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="locale" value={locale} />

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-[color:var(--color-text)]">{COPY.title}</h2>
          <AdminSubmitButton pendingLabel={COPY.saving}>{COPY.save}</AdminSubmitButton>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.slug}</span>
            <input
              name="slug"
              defaultValue={initialValues?.slug ?? ""}
              placeholder="авто з назви"
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
            <span className="text-xs leading-6 text-[color:var(--color-text-soft)]">{COPY.slugHint}</span>
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
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.parentCategory}</span>
            <select
              name="parentId"
              defaultValue={initialValues?.parentId ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            >
              <option value="">{COPY.noParent}</option>
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
            <span>{COPY.image}</span>
            <input
              name="image"
              defaultValue={initialValues?.image ?? ""}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
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
              name={`name:${defaultLocale}`}
              value={translations.name}
              onChange={(event) => updateTranslation("name", event.target.value)}
              required
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none"
            />
          </label>
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{COPY.description}</span>
            <textarea
              name={`description:${defaultLocale}`}
              value={translations.description}
              onChange={(event) => updateTranslation("description", event.target.value)}
              className="min-h-28 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-[color:var(--color-text)] outline-none"
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
