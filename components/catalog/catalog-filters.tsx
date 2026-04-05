"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogSearchParams } from "@/lib/storefront/queries";
import { cn } from "@/lib/utils";

type CategoryItem = {
  slug: string;
  parentId: string | null;
  name: string;
  children: Array<{
    slug: string;
    name: string;
  }>;
  count: number;
};

export function CatalogFilters({
  categories,
  filters,
  locale,
}: {
  categories: CategoryItem[];
  filters: CatalogSearchParams;
  locale: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startNavigation] = useTransition();

  const rootCategories = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories],
  );
  const activeCategory = categories.find((category) => category.slug === filters.category) ?? null;
  const allCategoriesLabel =
    locale === "uk" ? "Усі" : locale === "ru" ? "Все" : "All";

  const update = (updater: (current: URLSearchParams) => void) => {
    const current = new URLSearchParams(params.toString());

    updater(current);
    current.delete("page");

    const query = current.toString();
    startNavigation(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  };

  return (
    <div className={cn("space-y-6 transition", isPending && "opacity-85")} aria-busy={isPending}>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            update((current) => {
              current.delete("category");
              current.delete("subcategory");
            })
          }
          className={
            !filters.category
              ? "rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-5 py-3 text-sm font-medium text-[color:var(--color-text)] shadow-[0_12px_28px_rgba(24,184,255,0.14)] outline-none transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px"
              : "rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-5 py-3 text-sm font-medium text-[color:var(--color-text)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px"
          }
        >
          {allCategoriesLabel}
        </button>

        {rootCategories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() =>
              update((current) => {
                current.set("category", category.slug);
                current.delete("subcategory");
              })
            }
            className={
              filters.category === category.slug
                ? "rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-surface)] px-5 py-3 text-sm font-medium text-[color:var(--color-text)] shadow-[0_12px_28px_rgba(24,184,255,0.1)] outline-none transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px"
                : "rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-5 py-3 text-sm font-medium text-[color:var(--color-text)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px"
            }
          >
            {category.name}
          </button>
        ))}
      </div>

      {activeCategory && activeCategory.children.length > 0 ? (
        <div className="rounded-[1.6rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-2">
            {activeCategory.children.map((subcategory) => (
              <button
                key={subcategory.slug}
                type="button"
                onClick={() =>
                  update((current) => {
                    if (filters.subcategory === subcategory.slug) {
                      current.delete("subcategory");
                    } else {
                      current.set("subcategory", subcategory.slug);
                    }
                  })
                }
                  className={
                  filters.subcategory === subcategory.slug
                    ? "rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-text)] outline-none transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px"
                    : "rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-2 text-sm text-[color:var(--color-text-soft)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface-elevated)] hover:text-[color:var(--color-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 active:translate-y-px"
                }
              >
                {subcategory.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
