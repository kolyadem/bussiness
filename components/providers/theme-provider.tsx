"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribeToMount() {
  return () => {};
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem("lumina-theme", theme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /** Matches SSR; synced from <html data-theme> in useLayoutEffect (set before paint by app/layout.tsx script). */
  const [theme, setThemeState] = useState<Theme>("light");
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  useLayoutEffect(() => {
    const t = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setThemeState(t);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      mounted,
      setTheme: (nextTheme: Theme) => {
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      },
      toggleTheme: () => {
        const nextTheme = theme === "light" ? "dark" : "light";
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      },
    }),
    [mounted, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
