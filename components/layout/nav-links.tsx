"use client";

import { Link, usePathname } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  accent?: boolean;
};

export function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  items,
  mobile = false,
  variant = "default",
}: {
  items: NavItem[];
  mobile?: boolean;
  variant?: "default" | "account";
}) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full text-sm transition duration-300",
              mobile && "inline-flex min-h-10 shrink items-center justify-center px-3 sm:px-3.5",
              variant === "account"
                ? cn(
                    "border px-3.5 py-2 text-[color:var(--color-text-soft)] sm:px-4",
                    active
                      ? "border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                      : "border-[color:var(--color-line)] bg-transparent hover:border-[color:var(--color-line-strong)] hover:bg-[color:var(--color-surface-elevated)] hover:text-[color:var(--color-text)]",
                  )
                : cn(
                    "px-4 py-2.5",
                    item.accent &&
                      !active &&
                      "border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] shadow-[0_0_0_1px_var(--color-accent-line)]",
                    active
                      ? item.accent
                        ? "border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)] shadow-[0_0_0_1px_var(--color-accent-line),0_12px_30px_rgba(24,184,255,0.12)]"
                        : "bg-[color:var(--color-surface)] text-[color:var(--color-text)] shadow-[0_0_0_1px_var(--color-line),0_12px_30px_rgba(15,23,42,0.06)]"
                      : "text-[color:var(--color-text-soft)] hover:bg-[color:var(--color-surface)] hover:text-[color:var(--color-text)]",
                  ),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
