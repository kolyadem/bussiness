"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { CatalogSearchParams } from "@/lib/storefront/queries";
import { FilterChip } from "@/components/ui/filter-chip";
import { useCatalogNavigation } from "@/components/catalog/catalog-client-shell";
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

const AVAILABILITY_OPTIONS = [
  { value: "IN_STOCK", label: "В наявності" },
  { value: "LOW_STOCK", label: "Мало" },
  { value: "PREORDER", label: "Передзамовлення" },
] as const;

function countActiveFilters(filters: CatalogSearchParams): number {
  let count = 0;
  if (filters.q) count += 1;
  count += filters.availability.length;
  if (filters.minPrice !== null) count += 1;
  if (filters.maxPrice !== null) count += 1;
  if (filters.onSaleOnly) count += 1;
  return count;
}

function filtersKey(f: CatalogSearchParams) {
  return `${f.q}|${f.minPrice ?? ""}|${f.maxPrice ?? ""}`;
}

export function CatalogFilters({
  categories,
  filters,
  priceRange,
}: {
  categories: CategoryItem[];
  filters: CatalogSearchParams;
  locale: string;
  priceRange?: { min: number; max: number };
}) {
  const { isPending, navigate } = useCatalogNavigation();

  const [searchValue, setSearchValue] = useState(filters.q);
  const [minPriceValue, setMinPriceValue] = useState(filters.minPrice != null ? String(filters.minPrice) : "");
  const [maxPriceValue, setMaxPriceValue] = useState(filters.maxPrice != null ? String(filters.maxPrice) : "");

  const prevFiltersKey = useRef(filtersKey(filters));
  useEffect(() => {
    const key = filtersKey(filters);
    if (key !== prevFiltersKey.current) {
      prevFiltersKey.current = key;
      setSearchValue(filters.q);
      setMinPriceValue(filters.minPrice != null ? String(filters.minPrice) : "");
      setMaxPriceValue(filters.maxPrice != null ? String(filters.maxPrice) : "");
    }
  }, [filters]);

  const rootCategories = useMemo(
    () => categories.filter((category) => category.parentId === null),
    [categories],
  );
  const activeCategory = categories.find((category) => category.slug === filters.category) ?? null;

  const submitSearch = () => {
    const value = searchValue.trim();
    navigate((current) => {
      if (value) {
        current.set("q", value);
      } else {
        current.delete("q");
      }
    });
  };

  const submitPriceRange = () => {
    navigate((current) => {
      const min = minPriceValue.trim();
      const max = maxPriceValue.trim();
      if (min && Number(min) > 0) {
        current.set("minPrice", min);
      } else {
        current.delete("minPrice");
      }
      if (max && Number(max) > 0) {
        current.set("maxPrice", max);
      } else {
        current.delete("maxPrice");
      }
    });
  };

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className={cn("space-y-5 transition", isPending && "opacity-80")} aria-busy={isPending}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-soft)]" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Пошук: назва, SKU…"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitSearch();
            }}
            className="h-11 w-full rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] pl-11 pr-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          />
        </label>
        {activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSearchValue("");
              setMinPriceValue("");
              setMaxPriceValue("");
              navigate((current) => {
                current.delete("q");
                current.delete("availability");
                current.delete("minPrice");
                current.delete("maxPrice");
                current.delete("sale");
              });
            }}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-[1rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text-soft)] transition hover:border-[color:var(--color-accent-line)] hover:text-[color:var(--color-text)]"
          >
            Скинути
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--color-accent-strong)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--color-accent-contrast)]">
              {activeFilterCount}
            </span>
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          active={!filters.category}
          onClick={() =>
            navigate((current) => {
              current.delete("category");
              current.delete("subcategory");
            })
          }
        >
          Усі
        </FilterChip>
        {rootCategories.map((category) => (
          <FilterChip
            key={category.slug}
            active={filters.category === category.slug}
            onClick={() =>
              navigate((current) => {
                current.set("category", category.slug);
                current.delete("subcategory");
              })
            }
          >
            {category.name}
          </FilterChip>
        ))}
      </div>

      {activeCategory && activeCategory.children.length > 0 ? (
        <div className="rounded-[1.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-3 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap gap-2">
            {activeCategory.children.map((subcategory) => (
              <FilterChip
                key={subcategory.slug}
                active={filters.subcategory === subcategory.slug}
                tone="small-active"
                onClick={() =>
                  navigate((current) => {
                    if (filters.subcategory === subcategory.slug) {
                      current.delete("subcategory");
                    } else {
                      current.set("subcategory", subcategory.slug);
                    }
                  })
                }
              >
                {subcategory.name}
              </FilterChip>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        {AVAILABILITY_OPTIONS.map((option) => {
          const isActive = filters.availability.includes(option.value as never);
          return (
            <FilterChip
              key={option.value}
              active={isActive}
              tone="small-active"
              className="text-xs"
              onClick={() =>
                navigate((current) => {
                  const all = current.getAll("availability");
                  current.delete("availability");
                  if (isActive) {
                    all
                      .filter((v) => v !== option.value)
                      .forEach((v) => current.append("availability", v));
                  } else {
                    [...all, option.value].forEach((v) => current.append("availability", v));
                  }
                })
              }
            >
              {option.label}
            </FilterChip>
          );
        })}

        <FilterChip
          active={filters.onSaleOnly}
          tone="small-active"
          className="text-xs"
          onClick={() =>
            navigate((current) => {
              if (filters.onSaleOnly) {
                current.delete("sale");
              } else {
                current.set("sale", "1");
              }
            })
          }
        >
          Зі знижкою
        </FilterChip>

        {priceRange && priceRange.max > 0 ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder="Від"
              value={minPriceValue}
              onChange={(e) => setMinPriceValue(e.target.value)}
              onBlur={submitPriceRange}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-9 w-24 rounded-[0.75rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 text-xs text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
            <span className="text-xs text-[color:var(--color-text-soft)]">—</span>
            <input
              type="number"
              min={0}
              placeholder="До"
              value={maxPriceValue}
              onChange={(e) => setMaxPriceValue(e.target.value)}
              onBlur={submitPriceRange}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="h-9 w-24 rounded-[0.75rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 text-xs text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
