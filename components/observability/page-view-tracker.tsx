"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function sendAnalytics(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics", blob);
    return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export function PageViewTracker({ locale }: { locale: string }) {
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || previousPathRef.current === pathname) {
      return;
    }

    previousPathRef.current = pathname;
    sendAnalytics({
      event: "page_view",
      pathname,
      locale,
    });
  }, [locale, pathname]);

  return null;
}
