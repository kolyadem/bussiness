function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[1.6rem] bg-[color:var(--color-surface-elevated)] ${className}`} />;
}

export function ProductPageSkeleton() {
  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <SkeletonBlock className="h-5 w-36" />
      <section className="mt-6 grid gap-10 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <SkeletonBlock className="aspect-[4/3] w-full" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <SkeletonBlock className="h-6 w-32" />
          <SkeletonBlock className="h-14 w-4/5" />
          <SkeletonBlock className="h-10 w-48" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-36 w-full" />
        </div>
      </section>
      <section className="mt-12 grid gap-8 lg:grid-cols-2">
        <SkeletonBlock className="h-64 w-full" />
        <SkeletonBlock className="h-64 w-full" />
      </section>
    </main>
  );
}
