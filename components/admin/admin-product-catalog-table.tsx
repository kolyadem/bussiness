"use client";

import { startTransition, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import type { AppLocale } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  categoryName: string;
  heroImage: string;
  sku: string;
  status: string;
  price: number;
  purchasePrice: number | null;
  unitFinancials: {
    profitPerUnit: number | null;
    marginPercent: number | null;
  };
  currency: string;
  stock: number;
  updatedAt: string;
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<BulkAction>("PUBLISH");
  const [pending, setPending] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [value, setValue] = useState("");

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

    setPending(true);

    startTransition(async () => {
      try {
        const payload = await executeBulkAction(productIds);
        toast.success(`Оброблено: ${payload?.processedCount ?? productIds.length}`);
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося виконати масову дію");
      } finally {
        setPending(false);
      }
    });
  }

  function deleteSingle(productId: string) {
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
        window.location.reload();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не вдалося видалити");
      } finally {
        setPending(false);
      }
    });
  }

  const copy = {
    title: "Каталог товарів",
    countLabel: "товарів",
    add: "Додати товар",
    selected: "Вибрано",
    runBulk: "Застосувати",
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
    remove: "Видалити",
    bulkTools: "Масові дії та швидкі оновлення",
    value: "Значення",
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {copy.title}
          </h2>
          <p className="mt-3 text-sm text-[color:var(--color-text-soft)]">
            {products.length} {copy.countLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/admin/products/new`}>
            <Button>{copy.add}</Button>
          </a>
        </div>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_160px_220px_220px_auto]">
          <div>
            <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.bulkTools}</p>
            <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
              {copy.selected}: {selectedIds.length}
            </p>
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
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]">
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : bulkAction === "SET_PRICE" || bulkAction === "SET_STOCK" || bulkAction === "ADJUST_STOCK" || bulkAction === "ADJUST_PRICE_PERCENT" ? (
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
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[color:var(--color-line)]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                <th className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === products.length}
                    onChange={(event) =>
                      setSelectedIds(event.target.checked ? products.map((product) => product.id) : [])
                    }
                  />
                </th>
                <th className="px-5 py-4">{copy.product}</th>
                <th className="px-5 py-4">{copy.status}</th>
                <th className="px-5 py-4">{copy.price}</th>
                <th className="px-5 py-4">{copy.stock}</th>
                <th className="px-5 py-4">{copy.updated}</th>
                <th className="px-5 py-4 text-right">{copy.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--color-line)]">
              {products.map((product) => (
                <tr key={product.id} className="align-top">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[320px] gap-4">
                      <div className="w-24 shrink-0">
                        <ProductImageFrame
                          src={product.heroImage}
                          alt={product.name}
                          className="rounded-[1.2rem] bg-white/90 shadow-none"
                          fillClassName="p-4"
                        />
                      </div>
                      <div>
                        <p className="font-medium text-[color:var(--color-text)]">{product.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                          {product.sku} · {product.categoryName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{product.status}</td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">
                    <p>{formatPrice(product.price, locale, product.currency)}</p>
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
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text)]">{product.stock}</td>
                  <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
                    {formatStableDate(product.updatedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <a href={`/admin/products/${product.id}/edit`}>
                        <Button variant="secondary">{copy.edit}</Button>
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => deleteSingle(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>{copy.remove}</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
