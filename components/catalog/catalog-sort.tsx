"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CatalogSearchParams } from "@/lib/storefront/queries";
import { cn } from "@/lib/utils";

export function CatalogSort({
  sort,
  locale,
}: {
  sort: CatalogSearchParams["sort"];
  locale: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startNavigation] = useTransition();

  const sortLabels = {
    newest: "Спочатку нові",
    "price-asc": "Ціна: від нижчої",
    "price-desc": "Ціна: від вищої",
    rating: "За рейтингом",
  } satisfies Record<CatalogSearchParams["sort"], string>;

  const updateSort = (nextSort: string) => {
    const current = new URLSearchParams(params.toString());

    current.delete("page");

    if (nextSort === "newest") {
      current.delete("sort");
    } else {
      current.set("sort", nextSort);
    }

    const query = current.toString();
    startNavigation(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  };

  return (
    <div className={cn(isPending && "opacity-85")} aria-busy={isPending}>
      <select
        value={sort}
        onChange={(event) => updateSort(event.target.value)}
        className="h-11 min-w-56 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm font-medium text-[color:var(--color-text)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-line-strong)] focus:border-[color:var(--color-accent-line)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2"
      >
        <option value="newest">{sortLabels.newest}</option>
        <option value="price-asc">{sortLabels["price-asc"]}</option>
        <option value="price-desc">{sortLabels["price-desc"]}</option>
        <option value="rating">{sortLabels.rating}</option>
      </select>
    </div>
  );
}
