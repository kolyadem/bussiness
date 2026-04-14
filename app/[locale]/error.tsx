"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    console.error("Locale route error", error);
  }, [error]);

  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
          {t("errorPageTitle")}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-text-soft)]">{t("errorPageBody")}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => reset()}>{t("errorPageRetry")}</Button>
        </div>
      </section>
    </main>
  );
}
