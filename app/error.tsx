"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error", error);
  }, [error]);

  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-text-soft)]">
          Please try again. If the problem keeps happening, contact support.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </section>
    </main>
  );
}
