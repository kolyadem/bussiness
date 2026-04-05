"use client";

import { useEffect, useRef } from "react";

function sendAnalytics(payload: Record<string, unknown>) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

export function ConfiguratorOpenTracker({
  locale,
  buildSlug,
}: {
  locale: string;
  buildSlug?: string | null;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    sentRef.current = true;
    sendAnalytics({
      event: "configurator_open",
      pathname: `/${locale}/configurator`,
      locale,
      details: buildSlug ? { buildSlug } : undefined,
    });
  }, [buildSlug, locale]);

  return null;
}
