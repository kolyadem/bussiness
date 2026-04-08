import { ChevronsLeft, ChevronsRight } from "lucide-react";
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
}: {
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  filters: CatalogSearchParams;
}) {
  const { currentPage, totalPages, totalItems, pageSize, hasPreviousPage, hasNextPage } = pagination;

  if (totalItems <= 0) {
    return null;
  }

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);
  const previousLabel = "Назад";
  const nextLabel = "Далі";
  const firstLabel = "На початок";
  const lastLabel = "В кінець";

  if (totalPages <= 1) {
    return (
      <div
        className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-4 py-3 text-center shadow-[var(--shadow-soft)] sm:text-left"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-medium text-[color:var(--color-text)]">
          Усі результати на одній сторінці
        </p>
        <p className="mt-0.5 text-xs text-[color:var(--color-text-soft)]">
          Показано {totalItems} товарів
        </p>
      </div>
    );
  }

  const pages = buildPageWindow(currentPage, totalPages);

  return (
    <nav
      className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5"
      aria-label="Пагінація каталогу"
    >
      <div className="flex flex-col gap-1 border-b border-[color:var(--color-line)] pb-4 text-center sm:text-left">
        <p className="text-base font-semibold tracking-[-0.02em] text-[color:var(--color-text)]">
          Сторінка {currentPage} з {totalPages}
        </p>
        <p className="text-sm text-[color:var(--color-text-soft)]">
          Показано товари {rangeStart}–{rangeEnd} з {totalItems}
        </p>
      </div>

      <div className="flex flex-col items-stretch justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Link
            aria-disabled={!hasPreviousPage}
            href={createCatalogHref(filters, 1)}
            className={!hasPreviousPage ? "pointer-events-none opacity-50" : ""}
            title={firstLabel}
          >
            <Button variant="secondary" className="h-11 w-11 shrink-0 px-0" aria-label={firstLabel}>
              <ChevronsLeft className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link
            aria-disabled={!hasPreviousPage}
            href={createCatalogHref(filters, Math.max(1, currentPage - 1))}
            className={!hasPreviousPage ? "pointer-events-none opacity-50" : ""}
          >
            <Button variant="secondary">{previousLabel}</Button>
          </Link>
          <Link
            aria-disabled={!hasNextPage}
            href={createCatalogHref(filters, Math.min(totalPages, currentPage + 1))}
            className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
          >
            <Button variant="secondary">{nextLabel}</Button>
          </Link>
          <Link
            aria-disabled={!hasNextPage}
            href={createCatalogHref(filters, totalPages)}
            className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
            title={lastLabel}
          >
            <Button variant="secondary" className="h-11 w-11 shrink-0 px-0" aria-label={lastLabel}>
              <ChevronsRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
          <span className="mr-1 hidden text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)] sm:inline">
            Перейти до
          </span>
          {pages.map((page) => (
            <Link key={page} href={createCatalogHref(filters, page)}>
              <span
                className={
                  page === currentPage
                    ? "inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-strong)_100%)] px-4 text-sm font-semibold text-[color:var(--color-accent-contrast)] shadow-[0_12px_28px_rgba(24,184,255,0.16)]"
                    : "inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm font-medium text-[color:var(--color-text-soft)] outline-none transition duration-200 ease-out hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2"
                }
              >
                {page}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
