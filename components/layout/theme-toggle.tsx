"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const isDark = mounted ? theme === "dark" : false;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] shadow-[0_12px_30px_rgba(3,8,20,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-[color:var(--color-accent-line)] hover:text-[color:var(--color-accent-strong)]",
        !mounted && "opacity-80",
      )}
    >
      <SunMedium
        className={cn(
          "h-4 w-4 transition duration-300",
          isDark && "scale-0 -rotate-90 opacity-0",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition duration-300",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
