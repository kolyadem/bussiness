"use client";

import { useCatalogNavigation } from "@/components/catalog/catalog-client-shell";

function CardSkeleton() {
  return (
    <div className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex animate-pulse items-center justify-between gap-3 pb-3">
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-6 w-24 rounded-full bg-[color:var(--color-surface-elevated)]" />
        </div>
        <div className="h-6 w-14 rounded-full bg-[color:var(--color-surface-elevated)]" />
      </div>
      <div className="aspect-[4/3] animate-pulse rounded-[1.9rem] bg-[color:var(--color-surface-elevated)]" />
      <div className="mt-5 space-y-4">
        <div className="space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
        </div>
        <div className="rounded-[1.45rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3.5">
          <div className="h-4 w-16 animate-pulse rounded-full bg-[color:var(--color-surface-strong)]" />
          <div className="mt-3 h-7 w-28 animate-pulse rounded-full bg-[color:var(--color-surface-strong)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-11 flex-1 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-11 w-11 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-11 w-11 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
        </div>
      </div>
    </div>
  );
}

export function CatalogGridPending({ children }: { children: React.ReactNode }) {
  const { isPending } = useCatalogNavigation();

  return (
    <div className="min-w-0">
      {isPending ? (
        <div className="catalog-product-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
