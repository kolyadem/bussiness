import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import type { CatalogSearchParams } from "@/lib/storefront/queries";

function createCatalogHref(filters: CatalogSearchParams, page: number) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.subcategory) params.set("subcategory", filters.subcategory);
  for (const availability of filters.availability) params.append("availability", availability);
  if (typeof filters.minPrice === "number") params.set("minPrice", String(filters.minPrice));
  if (typeof filters.maxPrice === "number") params.set("maxPrice", String(filters.maxPrice));
  if (filters.onSaleOnly) params.set("sale", "1");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

function buildPageWindow(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  const pages: number[] = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

export function CatalogPagination({
  pagination,
  filters,
  locale,
}: {
  pagination: {
    currentPage: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  filters: CatalogSearchParams;
  locale: string;
}) {
  if (pagination.totalPages <= 1) {
    return null;
  }

  const pages = buildPageWindow(pagination.currentPage, pagination.totalPages);
  const previousLabel = "Назад";
  const nextLabel = "Далі";
  const pageLabel = "Сторінка";

  return (
    <nav className="flex flex-col items-center justify-between gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:flex-row">
      <div className="flex gap-3">
        <Link
          aria-disabled={!pagination.hasPreviousPage}
          href={createCatalogHref(filters, Math.max(1, pagination.currentPage - 1))}
          className={!pagination.hasPreviousPage ? "pointer-events-none opacity-50" : ""}
        >
          <Button variant="secondary">{previousLabel}</Button>
        </Link>
        <Link
          aria-disabled={!pagination.hasNextPage}
          href={createCatalogHref(
            filters,
            Math.min(pagination.totalPages, pagination.currentPage + 1),
          )}
          className={!pagination.hasNextPage ? "pointer-events-none opacity-50" : ""}
        >
          <Button variant="secondary">{nextLabel}</Button>
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
          {pageLabel}
        </span>
        {pages.map((page) => (
          <Link key={page} href={createCatalogHref(filters, page)}>
            <span
              className={
                page === pagination.currentPage
                  ? "inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-strong)_100%)] px-4 text-sm font-semibold text-[color:var(--color-accent-contrast)] shadow-[0_12px_28px_rgba(24,184,255,0.16)]"
                  : "inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm font-medium text-[color:var(--color-text-soft)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2"
              }
            >
              {page}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
