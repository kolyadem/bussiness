"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/providers/theme-provider";

export function ToastProvider() {
  const { theme, mounted } = useTheme();

  return (
    <Toaster
      theme={mounted ? theme : "light"}
      richColors
      position="bottom-right"
      toastOptions={{
        style: {
          borderRadius: "18px",
          border: "1px solid var(--color-line-strong)",
          background: "var(--color-surface-elevated)",
          color: "var(--color-text)",
          backdropFilter: "blur(20px)",
        },
      }}
    />
  );
}
