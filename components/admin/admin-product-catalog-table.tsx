"use client";

import { startTransition, useMemo, useState } from "react";
import { ExternalLink, LoaderCircle, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { formatPrice } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  heroImage: string;
  sku: string;
  slug: string;
  status: string;
  inventoryStatus: string;
  price: number;
  purchasePrice: number | null;
  unitFinancials: {
    profitPerUnit: number | null;
    marginPercent: number | null;
  };
  currency: string;
  stock: number;
  updatedAt: string;
  hasRozetkaUrl: boolean;
  hasTelemartUrl: boolean;
};

type Option = {
  id: string;
  name: string;
};

type BulkAction =
  | "PUBLISH"
  | "UNPUBLISH"
  | "MOVE_TO_DRAFT"
  | "ASSIGN_CATEGORY"
  | "DELETE"
  | "SET_PRICE"
  | "SET_STOCK"
  | "ADJUST_STOCK"
  | "ADJUST_PRICE_PERCENT";

const BULK_ACTIONS: BulkAction[] = [
  "PUBLISH",
  "UNPUBLISH",
  "MOVE_TO_DRAFT",
  "ASSIGN_CATEGORY",
  "SET_PRICE",
  "SET_STOCK",
  "ADJUST_STOCK",
  "ADJUST_PRICE_PERCENT",
  "DELETE",
];

function formatStableDate(value: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function bulkActionLabel(action: BulkAction) {
  switch (action) {
    case "PUBLISH":
      return "Опублікувати";
    case "UNPUBLISH":
      return "Зняти з публікації";
    case "MOVE_TO_DRAFT":
      return "У чернетку";
    case "ASSIGN_CATEGORY":
      return "Призначити категорію";
    case "DELETE":
      return "Видалити";
    case "SET_PRICE":
      return "Встановити ціну";
    case "SET_STOCK":
      return "Встановити залишок";
    case "ADJUST_STOCK":
      return "Змінити залишок";
    case "ADJUST_PRICE_PERCENT":
      return "Змінити ціну %";
  }
}

type StatusFilter = "ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED";
type StockFilter = "ALL" | "IN_STOCK" | "OUT_OF_STOCK" | "LOW_OR_OUT" | "NO_PRICE";
type SourceFilter = "ALL" | "BOTH" | "RZ_ONLY" | "TM_ONLY" | "NONE";
type SortOption = "UPDATED_DESC" | "UPDATED_ASC" | "NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC" | "STOCK_ASC" | "STOCK_DESC";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function formatProductStatus(value: string) {
  if (value === "PUBLISHED") return "Опубліковано";
  if (value === "DRAFT") return "Чернетка";
  if (value === "ARCHIVED") return "Архів";
  return value;
}

function formatInventoryStatus(value: string) {
  if (value === "IN_STOCK") return "В наявності";
  if (value === "LOW_STOCK") return "Мало";
  if (value === "OUT_OF_STOCK") return "Немає";
  if (value === "PREORDER") return "Передзамовлення";
  return value;
}

function getStatusPillClass(status: string) {
  if (status === "PUBLISHED") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  if (status === "DRAFT") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  if (status === "ARCHIVED") return "border-slate-500/25 bg-slate-500/10 text-slate-200";
  return "border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]";
}

function getInventoryPillClass(status: string) {
  if (status === "IN_STOCK") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  if (status === "LOW_STOCK") return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  if (status === "OUT_OF_STOCK") return "border-rose-500/20 bg-rose-500/10 text-rose-200";
  if (status === "PREORDER") return "border-sky-500/20 bg-sky-500/10 text-sky-200";
  return "border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]";
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, "uk", { sensitivity: "base" });
}

function parseIsoDate(value: string) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function AdminProductCatalogTable({
  locale,
  canViewFinancials,
  products,
  categories,
}: {
  locale: AppLocale;
  canViewFinancials: boolean;
  products: ProductRow[];
  categories: Option[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("PUBLISH");
  const [pending, setPending] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [sort, setSort] = useState<SortOption>("UPDATED_DESC");

  function toggleProduct(productId: string) {
    setSelectedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function buildBulkPayload(productIds: string[]) {
    return {
      productIds,
      action: bulkAction,
      categoryId: bulkAction === "ASSIGN_CATEGORY" ? categoryId : undefined,
      price: bulkAction === "SET_PRICE" ? Number(value) : undefined,
      stock: bulkAction === "SET_STOCK" ? Number(value) : undefined,
      delta:
        bulkAction === "ADJUST_STOCK" || bulkAction === "ADJUST_PRICE_PERCENT"
          ? Number(value)
          : undefined,
    };
  }

  async function executeBulkAction(productIds: string[]) {
    const response = await fetch("/api/admin/products/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildBulkPayload(productIds)),
    });
    const payload = (await response.json().catch(() => null)) as
      | { error?: string; processedCount?: number; failedCount?: number; errors?: string[] }
      | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Не вдалося виконати масову дію");
    }

    return payload;
  }

  function runBulk(productIds: string[]) {
    if (productIds.length === 0) {
      toast.error("Оберіть товари");
      return;
    }

    if (bulkAction === "DELETE") {
      const ok = window.confirm(
        `Видалити вибрані товари (${productIds.length})? Дію не можна скасувати.`,
      );
      if (!ok) {
        return;
      }
    }

    setPending(true);

    startTransition(async () => {
      try {
        const payload = await executeBulkAction(productIds);
        toast.success(`Оброблено: ${payload?.processedCount ?? productIds.length}`);
        setSelectedIds([]);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося виконати масову дію");
      } finally {
        setPending(false);
      }
    });
  }

  function deleteSingle(productId: string) {
    const ok = window.confirm("Видалити товар? Дію не можна скасувати.");
    if (!ok) {
      return;
    }
    setPending(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productIds: [productId],
            action: "DELETE",
          }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Не вдалося видалити");
        }

        toast.success("Товар видалено");
        setSelectedIds((current) => current.filter((id) => id !== productId));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося видалити");
      } finally {
        setPending(false);
      }
    });
  }

  function quickSetStatus(productId: string, action: Extract<BulkAction, "PUBLISH" | "MOVE_TO_DRAFT" | "UNPUBLISH">) {
    setPending(true);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [productId], action }),
        });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          throw new Error(payload?.error || "Не вдалося оновити статус");
        }
        toast.success("Статус оновлено");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося оновити статус");
      } finally {
        setPending(false);
      }
    });
  }

  const filteredProducts = useMemo(() => {
    const needle = normalizeText(query);
    const filtered = products.filter((product) => {
      if (statusFilter !== "ALL" && product.status !== statusFilter) {
        return false;
      }
      if (categoryFilter !== "ALL" && product.categoryId !== categoryFilter) {
        return false;
      }
      if (stockFilter !== "ALL") {
        if (stockFilter === "IN_STOCK" && product.inventoryStatus !== "IN_STOCK") return false;
        if (stockFilter === "OUT_OF_STOCK" && product.inventoryStatus !== "OUT_OF_STOCK") return false;
        if (stockFilter === "LOW_OR_OUT" && !["LOW_STOCK", "OUT_OF_STOCK"].includes(product.inventoryStatus)) {
          return false;
        }
        if (stockFilter === "NO_PRICE" && product.price !== 0) return false;
      }
      if (sourceFilter !== "ALL") {
        const rz = product.hasRozetkaUrl;
        const tm = product.hasTelemartUrl;
        if (sourceFilter === "BOTH" && !(rz && tm)) return false;
        if (sourceFilter === "RZ_ONLY" && !(rz && !tm)) return false;
        if (sourceFilter === "TM_ONLY" && !(!rz && tm)) return false;
        if (sourceFilter === "NONE" && (rz || tm)) return false;
      }
      if (!needle) return true;
      const hay = normalizeText(`${product.name} ${product.sku} ${product.categoryName}`);
      return hay.includes(needle);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case "UPDATED_DESC":
          return parseIsoDate(b.updatedAt) - parseIsoDate(a.updatedAt);
        case "UPDATED_ASC":
          return parseIsoDate(a.updatedAt) - parseIsoDate(b.updatedAt);
        case "NAME_ASC":
          return compareText(a.name, b.name);
        case "NAME_DESC":
          return compareText(b.name, a.name);
        case "PRICE_ASC":
          return (a.price ?? 0) - (b.price ?? 0);
        case "PRICE_DESC":
          return (b.price ?? 0) - (a.price ?? 0);
        case "STOCK_ASC":
          return (a.stock ?? 0) - (b.stock ?? 0);
        case "STOCK_DESC":
          return (b.stock ?? 0) - (a.stock ?? 0);
      }
    });

    return sorted;
  }, [products, query, statusFilter, categoryFilter, stockFilter, sourceFilter, sort]);

  const allVisibleSelected =
    filteredProducts.length > 0 && filteredProducts.every((product) => selectedIds.includes(product.id));

  const copy = {
    title: "Каталог товарів",
    countLabel: "товарів",
    add: "Додати товар",
    selected: "Вибрано",
    runBulk: "Застосувати",
    clear: "Скинути",
    product: "Товар",
    status: "Статус",
    price: "Ціна",
    financeCost: "Закупівля",
    financeProfit: "Прибуток",
    financeMargin: "Маржа",
    stock: "Залишок",
    updated: "Оновлено",
    actions: "Дії",
    edit: "Редагувати",
    openStorefront: "Storefront",
    remove: "Видалити",
    bulkTools: "Масові дії та швидкі оновлення",
    value: "Значення",
    searchPlaceholder: "Пошук: назва, SKU, категорія…",
    filters: "Фільтри",
    filterStatus: "Статус",
    filterCategory: "Категорія",
    filterStock: "Наявність",
    filterSource: "Джерела",
    sort: "Сортування",
    showAll: "Усі",
    visibleCount: "Показано",
    emptyTitle: "Нічого не знайдено",
    emptyText: "Змініть пошук або фільтри, щоб побачити товари.",
    sortOptions: {
      UPDATED_DESC: "Оновлені: новіші",
      UPDATED_ASC: "Оновлені: старіші",
      NAME_ASC: "Назва: А→Я",
      NAME_DESC: "Назва: Я→А",
      PRICE_ASC: "Ціна: ↑",
      PRICE_DESC: "Ціна: ↓",
      STOCK_ASC: "Залишок: ↑",
      STOCK_DESC: "Залишок: ↓",
    } satisfies Record<SortOption, string>,
  };

  const hasActiveFilters =
    query.trim().length > 0 || statusFilter !== "ALL" || categoryFilter !== "ALL" || stockFilter !== "ALL" || sourceFilter !== "ALL";

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)] md:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">
              {copy.visibleCount}: {filteredProducts.length} / {products.length} {copy.countLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                  setStockFilter("ALL");
                  setSourceFilter("ALL");
                }}
              >
                {copy.clear}
              </Button>
            ) : null}
            <Link href="/admin/products/new">
              <Button>{copy.add}</Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_260px_220px_200px_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--color-text-soft)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="h-11 w-full rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] pl-11 pr-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            <option value="ALL">
              {copy.filterStatus}: {copy.showAll}
            </option>
            <option value="PUBLISHED">{copy.filterStatus}: Опубліковано</option>
            <option value="DRAFT">{copy.filterStatus}: Чернетка</option>
            <option value="ARCHIVED">{copy.filterStatus}: Архів</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            <option value="ALL">
              {copy.filterCategory}: {copy.showAll}
            </option>
            {categories.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as StockFilter)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            <option value="ALL">
              {copy.filterStock}: {copy.showAll}
            </option>
            <option value="IN_STOCK">{copy.filterStock}: В наявності</option>
            <option value="LOW_OR_OUT">{copy.filterStock}: Мало / немає</option>
            <option value="OUT_OF_STOCK">{copy.filterStock}: Немає</option>
            <option value="NO_PRICE">{copy.filterStock}: Без ціни</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            <option value="ALL">{copy.filterSource}: {copy.showAll}</option>
            <option value="BOTH">{copy.filterSource}: Rz + Tm</option>
            <option value="RZ_ONLY">{copy.filterSource}: Тільки Rz</option>
            <option value="TM_ONLY">{copy.filterSource}: Тільки Tm</option>
            <option value="NONE">{copy.filterSource}: Без джерел</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            {Object.keys(copy.sortOptions).map((key) => (
              <option key={key} value={key}>
                {copy.sort}: {copy.sortOptions[key as SortOption]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <details className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 marker:content-none">
          <div>
            <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.bulkTools}</p>
            <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
              {copy.selected}: {selectedIds.length}
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
            {pending ? "…" : "Натисніть для налаштування"}
          </div>
        </summary>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_160px_220px_220px_auto]">
          <div className="text-sm text-[color:var(--color-text-soft)]">
            Масові дії застосовуються лише до вибраних рядків.
          </div>
          <select
            value={bulkAction}
            onChange={(event) => setBulkAction(event.target.value as BulkAction)}
            className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
          >
            {BULK_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {bulkActionLabel(action)}
              </option>
            ))}
          </select>
          {bulkAction === "ASSIGN_CATEGORY" ? (
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : bulkAction === "SET_PRICE" ||
            bulkAction === "SET_STOCK" ||
            bulkAction === "ADJUST_STOCK" ||
            bulkAction === "ADJUST_PRICE_PERCENT" ? (
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={copy.value}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          ) : (
            <div className="hidden xl:block" />
          )}
          <Button type="button" disabled={pending} onClick={() => runBulk(selectedIds)}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            <span>{copy.runBulk}</span>
          </Button>
        </div>
      </details>

      <section className="overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[color:var(--color-line)]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(event) => {
                      const visibleIds = filteredProducts.map((product) => product.id);
                      setSelectedIds((current) => {
                        if (!event.target.checked) {
                          return current.filter((id) => !visibleIds.includes(id));
                        }
                        const merged = new Set([...current, ...visibleIds]);
                        return Array.from(merged);
                      });
                    }}
                  />
                </th>
                <th className="px-4 py-3">{copy.product}</th>
                <th className="px-4 py-3">{copy.status}</th>
                <th className="px-4 py-3">{copy.price}</th>
                <th className="px-4 py-3">{copy.stock}</th>
                <th className="px-4 py-3 text-right">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-line)]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10">
                    <div className="rounded-[1.4rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-5 py-8 text-center">
                      <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.emptyTitle}</p>
                      <p className="mt-2 text-sm text-[color:var(--color-text-soft)]">{copy.emptyText}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                <tr key={product.id} className="align-top">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[320px] gap-3">
                      <div className="w-16 shrink-0">
                        <ProductImageFrame
                          src={product.heroImage}
                          alt={product.name}
                          className="rounded-[1.1rem] bg-white/90 shadow-none"
                          fillClassName="p-3"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-[color:var(--color-text)]">{product.name}</p>
                        <p className="mt-1 text-xs text-[color:var(--color-text-soft)]">
                          <span className="font-mono">{product.sku}</span>
                          <span className="px-1.5 opacity-60">·</span>
                          <span>{product.categoryName}</span>
                          <span className="px-1.5 opacity-60">·</span>
                          <span>
                            {copy.updated}: {formatStableDate(product.updatedAt)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs">
                          {product.hasRozetkaUrl && product.hasTelemartUrl ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Rz ✓ Tm ✓</span>
                          ) : product.hasRozetkaUrl ? (
                            <span className="text-amber-600 dark:text-amber-400">Rz ✓</span>
                          ) : product.hasTelemartUrl ? (
                            <span className="text-amber-600 dark:text-amber-400">Tm ✓</span>
                          ) : (
                            <span className="text-[color:var(--color-text-soft)] opacity-50">—</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-text)]">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getStatusPillClass(product.status)}`}
                      >
                        {formatProductStatus(product.status)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${getInventoryPillClass(product.inventoryStatus)}`}
                      >
                        {formatInventoryStatus(product.inventoryStatus)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-text)]">
                    <p>
                      {product.price === 0 ? (
                        <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500 dark:text-amber-200">
                          Без ціни
                        </span>
                      ) : (
                        formatPrice(product.price, locale, product.currency)
                      )}
                    </p>
                    {canViewFinancials ? (
                      <div className="mt-2 space-y-1 text-xs text-[color:var(--color-text-soft)]">
                        <p>
                          {copy.financeCost}:{" "}
                          <span className="text-[color:var(--color-text)]">
                            {typeof product.purchasePrice === "number"
                              ? formatPrice(product.purchasePrice, locale, product.currency)
                              : "—"}
                          </span>
                        </p>
                        <p>
                          {copy.financeProfit}:{" "}
                          <span className="text-[color:var(--color-text)]">
                            {typeof product.unitFinancials.profitPerUnit === "number"
                              ? formatPrice(
                                  product.unitFinancials.profitPerUnit,
                                  locale,
                                  product.currency,
                                )
                              : "—"}
                          </span>
                        </p>
                        <p>
                          {copy.financeMargin}:{" "}
                          <span className="text-[color:var(--color-text)]">
                            {typeof product.unitFinancials.marginPercent === "number"
                              ? `${product.unitFinancials.marginPercent.toFixed(1)}%`
                              : "—"}
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-text)]">{product.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <select
                        value={product.status}
                        disabled={pending}
                        onChange={(event) => {
                          const next = event.target.value;
                          if (next === "PUBLISHED") quickSetStatus(product.id, "PUBLISH");
                          if (next === "DRAFT") quickSetStatus(product.id, "MOVE_TO_DRAFT");
                          if (next === "ARCHIVED") quickSetStatus(product.id, "UNPUBLISH");
                        }}
                        className="h-9 rounded-[0.9rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 text-xs text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                        aria-label="Швидка зміна статусу"
                      >
                        <option value="PUBLISHED">Опубліковано</option>
                        <option value="DRAFT">Чернетка</option>
                        <option value="ARCHIVED">Архів</option>
                      </select>

                      <Link href={`/admin/products/${product.id}/edit`}>
                        <Button variant="secondary" className="h-9 px-3 text-xs">
                          {copy.edit}
                        </Button>
                      </Link>
                      <a
                        href={`/${locale}/product/${product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="ghost" className="h-9 px-3">
                          <ExternalLink className="h-4 w-4" />
                          <span className="sr-only">{copy.openStorefront}</span>
                        </Button>
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        className="h-9 px-3 text-xs"
                        onClick={() => deleteSingle(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{copy.remove}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
