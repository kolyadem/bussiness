import { parseJson } from "@/lib/utils";

export type PriceTrackingUrls = {
  rozetkaUrl: string | null;
  telemartUrl: string | null;
};

/**
 * Reads optional retailer product URLs from Product.metadata JSON.
 * Expected shape: { "priceTracking": { "rozetkaUrl": "...", "telemartUrl": "..." } }
 */
export function getPriceTrackingUrls(metadataJson: string): PriceTrackingUrls {
  const meta = parseJson<Record<string, unknown>>(metadataJson, {});
  const pt = meta.priceTracking;
  if (!pt || typeof pt !== "object") {
    return { rozetkaUrl: null, telemartUrl: null };
  }
  const o = pt as Record<string, unknown>;
  const r = o.rozetkaUrl;
  const t = o.telemartUrl;
  return {
    rozetkaUrl: typeof r === "string" && r.startsWith("http") ? r.trim() : null,
    telemartUrl: typeof t === "string" && t.startsWith("http") ? t.trim() : null,
  };
}
