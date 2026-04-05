"use client";

import { ChevronDown, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { locales, type AppLocale } from "@/lib/constants";
import { usePathname, useRouter } from "@/lib/i18n/routing";

const localeNames: Record<AppLocale, string> = {
  uk: "Українська",
  ru: "Русский",
  en: "English",
};

export function LocaleSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={rootRef} className="relative">
      <div className="hidden items-center gap-1 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-1 sm:flex">
        {locales.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => router.replace(pathname, { locale: item })}
            className={
              item === locale
                ? "rounded-full bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-strong)_100%)] px-3 py-2 text-xs font-medium text-slate-950 shadow-[0_10px_24px_rgba(24,184,255,0.22)]"
                : "rounded-full px-3 py-2 text-xs font-medium text-[color:var(--color-text-soft)] transition duration-300 hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-text)]"
            }
            aria-label={localeNames[item]}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={localeNames[locale]}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3.5 text-[color:var(--color-text)] shadow-[var(--shadow-soft)] transition hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface-strong)]"
        >
          <Languages className="h-4 w-4" />
          <span className="text-xs font-medium tracking-[0.16em]">{locale.toUpperCase()}</span>
          <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open ? (
          <div className="absolute right-0 top-[calc(100%+0.65rem)] z-[95] min-w-[11rem] overflow-hidden rounded-[1.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-1.5 shadow-[var(--shadow-strong)] supports-[backdrop-filter]:backdrop-blur-xl">
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.replace(pathname, { locale: item });
                }}
                className={
                  item === locale
                    ? "flex w-full items-center justify-between rounded-[1rem] bg-[color:var(--color-accent-soft)] px-3 py-2.5 text-left text-sm font-medium text-[color:var(--color-text)]"
                    : "flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left text-sm text-[color:var(--color-text-soft)] transition hover:bg-[color:var(--color-overlay-soft)] hover:text-[color:var(--color-text)]"
                }
              >
                <span>{localeNames[item]}</span>
                <span className="text-[11px] font-semibold tracking-[0.16em]">{item.toUpperCase()}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
