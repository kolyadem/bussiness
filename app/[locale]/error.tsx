"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function getCopy(locale: string) {
  if (locale === "uk") {
    return {
      title: "Щось пішло не так",
      body: "Спробуйте ще раз. Якщо проблема повторюється, зв'яжіться з підтримкою.",
      action: "Спробувати знову",
    };
  }

  if (locale === "ru") {
    return {
      title: "Что-то пошло не так",
      body: "Попробуйте ещё раз. Если проблема повторяется, свяжитесь с поддержкой.",
      action: "Повторить",
    };
  }

  return {
    title: "Something went wrong",
    body: "Please try again. If the problem keeps happening, contact support.",
    action: "Try again",
  };
}

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = typeof params.locale === "string" ? params.locale : "en";
  const copy = getCopy(locale);

  useEffect(() => {
    console.error("Locale route error", error);
  }, [error]);

  return (
    <main className="storefront-shell mx-auto px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-8 text-center shadow-[var(--shadow-soft)]">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-text-soft)]">{copy.body}</p>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => reset()}>{copy.action}</Button>
        </div>
      </section>
    </main>
  );
}
