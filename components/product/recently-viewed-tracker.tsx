"use client";

import { useEffect } from "react";

const RECENTLY_VIEWED_COOKIE = "lumina-recently-viewed";
const MAX_RECENTLY_VIEWED = 8;

export function RecentlyViewedTracker({ productId }: { productId: string }) {
  useEffect(() => {
    const cookieMap = document.cookie
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, entry) => {
        const [rawKey, ...rest] = entry.split("=");

        if (rawKey) {
          acc[rawKey] = rest.join("=");
        }

        return acc;
      }, {});

    const existing = decodeURIComponent(cookieMap[RECENTLY_VIEWED_COOKIE] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const next = [productId, ...existing.filter((value) => value !== productId)].slice(
      0,
      MAX_RECENTLY_VIEWED,
    );

    document.cookie = `${RECENTLY_VIEWED_COOKIE}=${encodeURIComponent(next.join(","))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  }, [productId]);

  return null;
}
