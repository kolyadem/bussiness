import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-medium shadow-[var(--shadow-soft)] outline-none transition duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
        variant === "primary" &&
          "border border-[color:var(--color-accent-line)] bg-[linear-gradient(135deg,var(--color-accent)_0%,var(--color-accent-strong)_100%)] text-[color:var(--color-accent-contrast)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-strong)]",
        variant === "secondary" &&
          "border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] hover:-translate-y-0.5 hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface-strong)]",
        variant === "ghost" &&
          "bg-transparent text-[color:var(--color-text-soft)] shadow-none hover:bg-[color:var(--color-accent-soft)] hover:text-[color:var(--color-text)]",
        className,
      )}
      {...props}
    />
  );
}
