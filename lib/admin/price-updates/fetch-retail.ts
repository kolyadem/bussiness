const FETCH_TIMEOUT_MS = 18_000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export type JsonLdProductIdentity = {
  name: string;
  brandName: string | null;
  sku: string | null;
  description: string | null;
};

function readBrandName(brand: unknown): string | null {
  if (typeof brand === "string") return brand.trim() || null;
  if (brand && typeof brand === "object" && "name" in brand) {
    const n = (brand as { name?: unknown }).name;
    return typeof n === "string" ? n.trim() || null : null;
  }
  return null;
}

function normalizeLdType(t: unknown): string | null {
  if (typeof t === "string") return t;
  if (Array.isArray(t) && typeof t[0] === "string") return t[0];
  return null;
}

/**
 * Collects schema.org Product identities from ld+json (primary source for retailer matching).
 */
export function extractJsonLdProductIdentities(html: string): JsonLdProductIdentity[] {
  const out: JsonLdProductIdentity[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]?.trim() ?? "") as unknown;
      const queue: unknown[] = Array.isArray(j) ? [...j] : [j];
      while (queue.length) {
        const node = queue.shift();
        if (node == null || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        if (Array.isArray(o["@graph"])) {
          queue.push(...o["@graph"]);
        }
        const typ = normalizeLdType(o["@type"]);
        if (typ !== "Product") continue;
        const name = typeof o.name === "string" ? o.name : "";
        const brandName = readBrandName(o.brand);
        const sku = typeof o.sku === "string" ? o.sku : typeof o.sku === "number" ? String(o.sku) : null;
        const description = typeof o.description === "string" ? o.description : null;
        if (name.trim() || sku) {
          out.push({ name: name.trim(), brandName, sku, description });
        }
      }
    } catch {
      /* next block */
    }
  }
  return out;
}

/** Prefer schema.org Product offer price when present (stable vs. max-of-all-₴ on long pages). */
function extractUahFromJsonLd(html: string): number | null {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]?.trim() ?? "") as unknown;
      const queue: unknown[] = Array.isArray(j) ? [...j] : [j];
      while (queue.length) {
        const node = queue.shift();
        if (node == null || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        if (Array.isArray(o["@graph"])) {
          queue.push(...o["@graph"]);
        }
        if (o["@type"] === "Product" && o.offers != null) {
          const offers = Array.isArray(o.offers) ? o.offers : [o.offers];
          for (const off of offers) {
            if (off == null || typeof off !== "object") continue;
            const offer = off as Record<string, unknown>;
            if (offer.priceCurrency !== "UAH") continue;
            const p = offer.price;
            const n = typeof p === "number" ? p : typeof p === "string" ? Number.parseInt(p.replace(/\s/g, ""), 10) : NaN;
            if (Number.isFinite(n) && n >= 39 && n <= 9_999_999) {
              return n;
            }
          }
        }
      }
    } catch {
      /* try next ld+json block */
    }
  }
  return null;
}

/** Parsed availability for one retailer page (conservative; unknown when uncertain). */
export type RetailAvailabilityLevel = "in_stock" | "out_of_stock" | "unknown";

export type RetailAvailabilityParse = {
  status: RetailAvailabilityLevel;
  /** Short machine-oriented reason for preview / audit */
  rationale: string;
};

function mapSchemaOrgAvailabilityUrl(raw: string): RetailAvailabilityLevel | null {
  const u = raw.trim().toLowerCase();
  if (!u) return null;
  if (u.includes("instock") && !u.includes("outofstock") && !u.includes("out_of_stock")) {
    return "in_stock";
  }
  if (
    u.includes("outofstock") ||
    u.includes("out_of_stock") ||
    u.includes("soldout") ||
    u.includes("discontinued")
  ) {
    return "out_of_stock";
  }
  if (u.includes("preorder") || u.includes("pre_order") || u.includes("presale")) {
    return null;
  }
  if (u.includes("limited") || u.includes("onlineonly")) {
    return null;
  }
  return null;
}

function readOfferAvailability(offer: Record<string, unknown>): string | null {
  const a = offer.availability;
  if (typeof a === "string") return a;
  if (a && typeof a === "object" && "@id" in a && typeof (a as { "@id"?: unknown })["@id"] === "string") {
    return (a as { "@id": string })["@id"];
  }
  return null;
}

/**
 * Uses schema.org Product → offers[].availability (same JSON-LD blocks as price).
 */
export function extractAvailabilityFromJsonLd(html: string): RetailAvailabilityParse | null {
  const levels: RetailAvailabilityLevel[] = [];
  const seenRationale: string[] = [];

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]?.trim() ?? "") as unknown;
      const queue: unknown[] = Array.isArray(j) ? [...j] : [j];
      while (queue.length) {
        const node = queue.shift();
        if (node == null || typeof node !== "object") continue;
        const o = node as Record<string, unknown>;
        if (Array.isArray(o["@graph"])) {
          queue.push(...o["@graph"]);
        }
        const typ = normalizeLdType(o["@type"]);
        if (typ !== "Product" || o.offers == null) continue;
        const offers = Array.isArray(o.offers) ? o.offers : [o.offers];
        const offerRows = offers.filter(
          (x): x is Record<string, unknown> => x != null && typeof x === "object",
        ) as Record<string, unknown>[];
        const ordered = [
          ...offerRows.filter((of) => of.priceCurrency === "UAH"),
          ...offerRows.filter((of) => of.priceCurrency !== "UAH"),
        ];
        for (const offer of ordered) {
          const url = readOfferAvailability(offer);
          if (!url) continue;
          const mapped = mapSchemaOrgAvailabilityUrl(url);
          if (mapped) {
            levels.push(mapped);
            seenRationale.push(url);
          }
        }
      }
    } catch {
      /* next block */
    }
  }

  if (levels.length === 0) {
    return null;
  }
  const hasIn = levels.includes("in_stock");
  const hasOut = levels.includes("out_of_stock");
  if (hasIn && hasOut) {
    return {
      status: "unknown",
      rationale: "JSON-LD: conflicting InStock/OutOfStock on offers",
    };
  }
  if (hasOut) {
    return {
      status: "out_of_stock",
      rationale: `JSON-LD OutOfStock (${seenRationale[0] ?? "offer"})`,
    };
  }
  if (hasIn) {
    return {
      status: "in_stock",
      rationale: `JSON-LD InStock (${seenRationale[0] ?? "offer"})`,
    };
  }
  return null;
}

function stripHtmlForAvailability(html: string): string {
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyle = noScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  return noStyle.replace(/<[^>]+>/g, " ");
}

/**
 * Fallback when JSON-LD has no availability: only unambiguous phrase pairs (UA/RU).
 */
function extractAvailabilityFromVisibleText(html: string): RetailAvailabilityParse {
  const text = stripHtmlForAvailability(html).toLowerCase();

  const outHit =
    /\bнемає в наявності\b/.test(text) ||
    /\bнемає в продажу\b/.test(text) ||
    /\bнет в наличии\b/.test(text) ||
    /\bнет в продаже\b/.test(text);

  const inHit =
    /\bє в наявності\b/.test(text) ||
    /\bесть в наличии\b/.test(text);

  if (outHit && inHit) {
    return { status: "unknown", rationale: "Text: conflicting in/out markers" };
  }
  if (outHit) {
    return { status: "out_of_stock", rationale: "Text: explicit out-of-stock phrase" };
  }
  if (inHit) {
    return { status: "in_stock", rationale: "Text: explicit in-stock phrase" };
  }
  return { status: "unknown", rationale: "No JSON-LD availability; insufficient text signals" };
}

export function extractRetailAvailabilityFromHtml(html: string): RetailAvailabilityParse {
  if (!html.trim()) {
    return { status: "unknown", rationale: "Empty page" };
  }
  const fromLd = extractAvailabilityFromJsonLd(html);
  if (fromLd) {
    return fromLd;
  }
  return extractAvailabilityFromVisibleText(html);
}

/**
 * Extracts the first plausible retail UAH price from HTML (Rozetka / Telemart markup varies).
 * Returns null if nothing reasonable is found.
 */
export function extractUahPriceFromHtml(html: string): number | null {
  // Telemart often puts ₴ inside <span> (e.g. "7 955 <span>₴</span>"); Rozetka often uses "7 906₴".
  const matches = html.matchAll(
    /(\d[\d\s]*)\s*(?:<span[^>]*>\s*)?(?:₴|грн|UAH)/gi,
  );
  const candidates: number[] = [];
  for (const m of matches) {
    const raw = m[1]?.replace(/\s+/g, "") ?? "";
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 39 && n <= 9_999_999) {
      candidates.push(n);
    }
  }
  if (candidates.length === 0) {
    return null;
  }
  // Prefer the largest visible price (often the main product price is among the highest early in page)
  return Math.max(...candidates);
}

export async function fetchRetailPage(url: string): Promise<{
  html: string;
  uah: number | null;
  availability: RetailAvailabilityParse;
  error?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "uk-UA,uk;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        html: "",
        uah: null,
        availability: { status: "unknown", rationale: `HTTP ${res.status}` },
        error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const availability = extractRetailAvailabilityFromHtml(html);
    const uah = extractUahFromJsonLd(html) ?? extractUahPriceFromHtml(html);
    if (uah == null) {
      return { html, uah: null, availability, error: "No UAH price pattern" };
    }
    return { html, uah, availability };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return {
      html: "",
      uah: null,
      availability: { status: "unknown", rationale: msg },
      error: msg,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** @deprecated use fetchRetailPage */
export async function fetchRetailPriceUah(url: string): Promise<{ uah: number | null; error?: string }> {
  const r = await fetchRetailPage(url);
  return { uah: r.uah, error: r.error };
}

export function pageLikelyContainsSku(html: string, sku: string): boolean {
  const s = sku.trim();
  if (s.length < 3) {
    return false;
  }
  return html.includes(s);
}
