"use client";

import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ImageOff, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

type MiniCartItem = {
  id: string;
  slug: string;
  name: string;
  heroImage: string;
  quantity: number;
  price: number;
  currency: string;
};

function resolveMiniCartImageSrc(src: string | null | undefined) {
  const value = src?.trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  return `/${value.replace(/^\/+/, "")}`;
}

function MiniCartThumbnail({
  src,
  alt,
  fallbackLabel,
}: {
  src: string;
  alt: string;
  fallbackLabel: string;
}) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveMiniCartImageSrc(src);
  const showFallback = hasError || !resolvedSrc;

  return (
    <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-[1.25rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
      <div className="absolute inset-x-3 top-2 h-8 rounded-full bg-[color:var(--color-accent-soft)] blur-2xl" />
      {showFallback ? (
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-1 text-[color:var(--color-text-soft)]">
          <ImageOff className="h-4 w-4" />
          <span className="px-2 text-center text-[10px] font-medium uppercase tracking-[0.16em]">
            {fallbackLabel}
          </span>
        </div>
      ) : (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes="76px"
          className="object-contain p-2.5"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

export function MiniCart({
  itemCount,
  subtotal,
  items,
}: {
  itemCount: number;
  subtotal: number;
  items: MiniCartItem[];
}) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeMiniCart = useEffectEvent(() => {
    setOpen(false);
  });

  useEffect(() => {
    closeMiniCart();
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const subtitle =
    locale === "uk"
      ? `${itemCount} товарів у кошику`
      : locale === "ru"
        ? `${itemCount} товаров в корзине`
        : `${itemCount} items in cart`;
  const emptyDescription =
    locale === "uk"
      ? "Додайте товари з каталогу, щоб швидко повернутися до покупки."
      : locale === "ru"
        ? "Добавьте товары из каталога, чтобы быстро вернуться к покупке."
        : "Add products from the catalog to keep your selection close at hand.";
  const subtotalLabel =
    locale === "uk" ? "Сума зараз" : locale === "ru" ? "Сумма сейчас" : "Current subtotal";
  const openCartLabel =
    locale === "uk" ? "Відкрити кошик" : locale === "ru" ? "Открыть корзину" : "Open cart";
  const imageFallbackLabel =
    locale === "uk" ? "Без фото" : locale === "ru" ? "Без фото" : "No image";

  return (
    <div ref={rootRef} className={`relative ${open ? "z-[90]" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("navCart")}
        className="relative inline-flex h-11 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 text-[color:var(--color-text)] shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface-strong)] sm:px-4"
      >
        <ShoppingBag className="h-4 w-4" />
        <span className="ml-2 hidden text-sm sm:inline">{t("navCart")}</span>
        <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[color:var(--color-accent-strong)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--color-accent-contrast)]">
          {itemCount}
        </span>
      </button>

      {open ? (
        <>
          <div
            className="mini-cart-backdrop fixed inset-0 z-[80] bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.22)_100%)] backdrop-blur-[8px] dark:bg-[linear-gradient(180deg,rgba(2,8,20,0.34)_0%,rgba(2,8,20,0.56)_100%)]"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          <div className="fixed left-1/2 top-[calc(var(--header-offset)+0.75rem)] z-[90] w-[calc(100vw-1rem)] max-w-[26rem] -translate-x-1/2 px-0 sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+0.9rem)] sm:w-[min(92vw,26rem)] sm:max-w-none sm:translate-x-0">
            <div
              role="dialog"
              aria-label={t("navCart")}
              className="mini-cart-panel relative overflow-hidden rounded-[1.6rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-strong)] p-3.5 shadow-[0_36px_100px_rgba(15,23,42,0.22)] ring-1 ring-[color:var(--color-line)] supports-[backdrop-filter]:bg-[color:var(--color-surface-elevated)] supports-[backdrop-filter]:backdrop-blur-[18px] dark:shadow-[0_42px_110px_rgba(2,8,20,0.56)] sm:rounded-[2rem] sm:p-4"
            >
              <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,var(--color-surface-elevated)_0%,var(--color-surface)_100%)]" />
              <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-[color:var(--color-accent-soft)] opacity-80 blur-3xl" />
              <div className="pointer-events-none absolute inset-x-12 bottom-0 h-16 rounded-full bg-[color:var(--color-accent-line)] opacity-55 blur-3xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-heading text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-text)] sm:text-xl">
                    {t("navCart")}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">{subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] text-[color:var(--color-text-soft)] transition hover:border-[color:var(--color-accent-line)] hover:text-[color:var(--color-text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="relative mt-4 rounded-[1.35rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-7 text-center backdrop-blur-xl sm:mt-5 sm:rounded-[1.5rem] sm:px-5 sm:py-8">
                  <p className="text-sm leading-7 text-[color:var(--color-text-soft)]">{emptyDescription}</p>
                  <Link href="/catalog" className="mt-5 inline-flex">
                    <Button variant="secondary">{t("continueShopping")}</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="relative mt-4 max-h-[min(20rem,52vh)] space-y-3 overflow-y-auto pr-1 sm:mt-5 sm:max-h-[min(24rem,60vh)]">
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/product/${item.slug}`}
                        className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-3 rounded-[1.25rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-3 backdrop-blur-xl transition hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-overlay-strong)] sm:rounded-[1.4rem]"
                      >
                        <MiniCartThumbnail
                          src={item.heroImage}
                          alt={item.name}
                          fallbackLabel={imageFallbackLabel}
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium leading-6 text-[color:var(--color-text)]">
                            {item.name}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-xs text-[color:var(--color-text-soft)]">
                              {t("quantity")}: {item.quantity}
                            </span>
                            <span className="text-sm font-semibold text-[color:var(--color-text)]">
                              {formatPrice(item.price * item.quantity, locale, item.currency)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  <div className="relative mt-4 rounded-[1.35rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 backdrop-blur-xl sm:mt-5 sm:rounded-[1.5rem]">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-[color:var(--color-text-soft)]">{subtotalLabel}</span>
                      <span className="font-heading text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)] sm:text-2xl">
                        {formatPrice(subtotal, locale, items[0]?.currency ?? "USD")}
                      </span>
                    </div>
                  </div>

                  <Link href="/cart" className="relative mt-4 inline-flex w-full sm:mt-5">
                    <Button className="w-full">{openCartLabel}</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
