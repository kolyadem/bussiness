function ProductCardSkeleton() {
  return (
    <div className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex animate-pulse items-center justify-between gap-3 pb-3">
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-6 w-24 rounded-full bg-[color:var(--color-surface-elevated)]" />
        </div>
        <div className="h-6 w-14 rounded-full bg-[color:var(--color-surface-elevated)]" />
      </div>
      <div className="aspect-[4/4.3] animate-pulse rounded-[1.9rem] bg-[color:var(--color-surface-elevated)]" />
      <div className="mt-5 space-y-4">
        <div className="flex animate-pulse justify-between">
          <div className="h-6 w-24 rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-6 w-12 rounded-full bg-[color:var(--color-surface-elevated)]" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-3/4 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
        </div>
        <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3.5">
          <div className="h-4 w-16 animate-pulse rounded-full bg-[color:var(--color-surface-strong)]" />
          <div className="mt-3 h-8 w-28 animate-pulse rounded-full bg-[color:var(--color-surface-strong)]" />
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

export function CatalogSkeleton() {
  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-5 lg:px-7 xl:px-8 2xl:px-10">
      <section className="rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="space-y-6">
          <div className="h-12 w-72 animate-pulse rounded-full bg-[color:var(--color-surface-elevated)]" />
          <div className="h-56 animate-pulse rounded-[2rem] bg-[color:var(--color-surface-elevated)]" />
        </div>
      </section>
      <section className="mt-8 grid gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </section>
    </main>
  );
}
