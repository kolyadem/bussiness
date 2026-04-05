import { parseJson } from "@/lib/utils";
import { extractJsonLdProductIdentities } from "@/lib/admin/price-updates/fetch-retail";

export type MatchKind = "cpu" | "ssd" | "ram" | "case" | "other";

export type CatalogMatchInput = {
  categorySlug: string;
  nameUk: string;
  productSlug: string;
  brandSlug: string;
  brandNameUk: string | null;
  metadataJson: string;
  specsJson: string;
  socket: string | null;
  formFactor: string | null;
  storageInterface: string | null;
  memoryCapacityGb: number | null;
};

export type PreviewMatchResult = {
  lineStatus: "APPROVED_CANDIDATE" | "MANUAL_REVIEW" | "REJECTED";
  confidence: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  matchNote: string;
};

/** Per-retailer evaluation for QA / live preview reports (mirrors internal `evaluateSide`). */
export type PreviewMatchSideDiagnostics = {
  retailer: "rozetka" | "telemart";
  ok: boolean;
  hadPrice: boolean;
  strong: boolean;
  medium: boolean;
  weak: boolean;
  reject: boolean;
  rejectReason?: string;
  detail: string;
};

export type PreviewMatchOutcomePath =
  | "no_base_price"
  | "rejected_conflict"
  | "approved_high_both_strong"
  | "approved_medium_one_strong"
  | "manual_review_medium_only"
  | "manual_review_low_weak";

export type PreviewMatchDiagnostics = {
  outcomePath: PreviewMatchOutcomePath;
  identity: ReturnType<typeof buildCatalogIdentity>;
  rozetka: PreviewMatchSideDiagnostics;
  telemart: PreviewMatchSideDiagnostics;
  result: PreviewMatchResult;
};

const MPN_PATTERNS: RegExp[] = [
  /\b(100-\d{9,12}[A-Z]*)\b/gi,
  /\b(MZ-V[0-9A-Z]+)\b/gi,
  /\b(WDS[0-9A-Z]+)\b/gi,
  /\b(FD-[A-Z]-[A-Z0-9-]+)\b/gi,
  /\b(CT[0-9A-Z]{5,})\b/gi,
  /\b(CMH[0-9A-Z]+)\b/gi,
  /\b(CMK[0-9A-Z]+)\b/gi,
];

export function categorySlugToMatchKind(slug: string): MatchKind {
  switch (slug) {
    case "processors":
      return "cpu";
    case "storage":
      return "ssd";
    case "memory":
      return "ram";
    case "cases":
      return "case";
    default:
      return "other";
  }
}

function stripSpacesUpper(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

/** Visible + machine text for substring checks (JSON-LD first; then light HTML strip). */
export function buildRetailHaystack(html: string): string {
  const fromLd = extractJsonLdProductIdentities(html);
  const ldPart = fromLd
    .map((p) => [p.name, p.brandName ?? "", p.sku ?? "", (p.description ?? "").slice(0, 4000)].join(" "))
    .join("\n");
  const noScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  const noStyle = noScripts.replace(/<style[\s\S]*?<\/style>/gi, " ");
  const rough = noStyle.replace(/<[^>]+>/g, " ");
  return `${ldPart}\n${rough}`.slice(0, 450_000);
}

export function extractMpnLikeTokens(text: string): string[] {
  const out = new Set<string>();
  const t = text;
  for (const re of MPN_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const raw = m[1] ?? m[0];
      if (raw) out.add(stripSpacesUpper(raw));
    }
  }
  return [...out];
}

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function buildCatalogIdentity(input: CatalogMatchInput): {
  kind: MatchKind;
  mpnCandidates: string[];
  cpuModelToken: string | null;
  amdIntelPart: string | null;
  packagingHint: "box" | "tray" | "wof" | null;
  capacityNorm: string | null;
} {
  const kind = categorySlugToMatchKind(input.categorySlug);
  const meta = parseJson<Record<string, unknown>>(input.metadataJson, {});
  const specs = parseJson<Record<string, unknown>>(input.specsJson, {});

  const mpns: string[] = [];
  const push = (s: string | null | undefined) => {
    if (!s) return;
    const n = stripSpacesUpper(s);
    if (n.length >= 4) mpns.push(n);
  };

  push(metaString(meta, "mpn"));
  push(metaString(meta, "manufacturerPartNumber"));
  push(metaString(meta, "partNumber"));
  const pm = meta.priceMatch;
  if (pm && typeof pm === "object") {
    const o = pm as Record<string, unknown>;
    if (Array.isArray(o.mpns)) {
      for (const x of o.mpns) {
        if (typeof x === "string") push(x);
      }
    }
    if (typeof o.primaryMpn === "string") push(o.primaryMpn);
  }

  const name = `${input.nameUk} ${input.productSlug}`;
  for (const t of extractMpnLikeTokens(name)) {
    push(t);
  }

  const cap =
    typeof specs.capacity === "string"
      ? specs.capacity
      : typeof specs.capacityGb === "number"
        ? `${specs.capacityGb} GB`
        : null;
  const capacityNorm = cap ? stripSpacesUpper(cap.replace(/,/g, ".")) : null;

  let packagingHint: "box" | "tray" | "wof" | null = null;
  const low = name.toLowerCase();
  if (/\btray\b|tray/i.test(name)) packagingHint = "tray";
  else if (/\bwof\b/i.test(name)) packagingHint = "wof";
  else if (/\bbox\b|box\b/i.test(low)) packagingHint = "box";

  const amdIntelPart =
    name.match(/\b(100-\d{9,12}[A-Z]*)\b/i)?.[1]?.toUpperCase() ?? null;

  let cpuModelToken: string | null = null;
  const m7800 = name.match(/\b(7800X3D|7900X3D|5800X3D|5600X3D)\b/i);
  const mX = name.match(/\b(\d{4}X3D|\d{4}X)\b/i);
  if (m7800) cpuModelToken = m7800[1]!.toUpperCase();
  else if (mX) cpuModelToken = mX[1]!.toUpperCase();

  return {
    kind,
    mpnCandidates: [...new Set(mpns)],
    cpuModelToken,
    amdIntelPart: amdIntelPart ? stripSpacesUpper(amdIntelPart) : null,
    packagingHint,
    capacityNorm,
  };
}

/** Intel boxed / tray ordering codes (normalized: no spaces, upper case). */
function isIntelOrderingMpnCandidate(m: string): boolean {
  return /^BX807[A-Z0-9]+$/.test(m) || /^CM807[A-Z0-9]+$/.test(m);
}

function brandMatches(catalogBrandSlug: string, catalogBrandName: string | null, haystack: string): boolean {
  const h = haystack.toLowerCase();
  if (catalogBrandSlug && h.includes(catalogBrandSlug.replace(/-/g, " "))) return true;
  if (catalogBrandName && h.includes(catalogBrandName.toLowerCase())) return true;
  return false;
}

type SideSignal = {
  ok: boolean;
  strong: boolean;
  medium: boolean;
  weak: boolean;
  reject: boolean;
  rejectReason?: string;
  detail: string;
};

function toSideDiagnostics(
  retailer: "rozetka" | "telemart",
  hadPrice: boolean,
  s: SideSignal,
): PreviewMatchSideDiagnostics {
  return {
    retailer,
    ok: s.ok,
    hadPrice,
    strong: s.strong,
    medium: s.medium,
    weak: s.weak,
    reject: s.reject,
    rejectReason: s.rejectReason,
    detail: s.detail,
  };
}

function evaluateSide(
  kind: MatchKind,
  catalog: ReturnType<typeof buildCatalogIdentity>,
  catalogInput: CatalogMatchInput,
  html: string,
  hadPrice: boolean,
): SideSignal {
  if (!hadPrice || !html.trim()) {
    return { ok: false, strong: false, medium: false, weak: false, reject: false, detail: "no price or empty html" };
  }

  const hay = buildRetailHaystack(html);
  const hayNorm = stripSpacesUpper(hay);
  const ld = extractJsonLdProductIdentities(html);
  const primaryName = ld[0]?.name ?? "";
  const primaryLower = primaryName.toLowerCase();

  const brandOk = brandMatches(catalogInput.brandSlug, catalogInput.brandNameUk, hay);

  if (kind === "ssd") {
    const catMpns = catalog.mpnCandidates.filter((m) => m.length >= 6);
    const found = extractMpnLikeTokens(hay).filter((t) => t.startsWith("MZ") || t.startsWith("WDS") || t.startsWith("CT"));
    const catalogHit = catMpns.some((c) => hayNorm.includes(c));
    if (catalogHit) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: "SSD MPN match" };
    }
    if (catMpns.length > 0 && found.length > 0) {
      const overlap = found.some((f) => catMpns.includes(f));
      if (!overlap) {
        return {
          ok: true,
          strong: false,
          medium: false,
          weak: false,
          reject: true,
          rejectReason: `SSD part mismatch (catalog ${catMpns.join(", ")} vs page ${found.join(", ")})`,
          detail: "ssd conflict",
        };
      }
    }
    const med = brandOk && capacityMatches(catalog.capacityNorm, hayNorm);
    return {
      ok: true,
      strong: false,
      medium: med,
      weak: brandOk,
      reject: false,
      detail: med ? "SSD brand+capacity" : "SSD weak",
    };
  }

  if (kind === "ram") {
    const catMpns = catalog.mpnCandidates.filter((m) => m.length >= 5);
    const found = extractMpnLikeTokens(hay).filter((t) => t.startsWith("CM") || t.startsWith("KF") || t.startsWith("CT"));
    const hit = catMpns.some((c) => hayNorm.includes(c));
    if (hit) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: "RAM part match" };
    }
    if (catMpns.length > 0 && found.length > 0 && !found.some((f) => catMpns.includes(f))) {
      return {
        ok: true,
        strong: false,
        medium: false,
        weak: false,
        reject: true,
        rejectReason: `RAM part mismatch (catalog ${catMpns.join(", ")} vs page ${found.join(", ")})`,
        detail: "ram conflict",
      };
    }
    const med = brandOk && (memoryGbMatches(catalogInput.memoryCapacityGb, hay) || ddrGenMatches(hayNorm, catalogInput));
    return {
      ok: true,
      strong: false,
      medium: med,
      weak: brandOk,
      reject: false,
      detail: med ? "RAM brand+size/gen" : "RAM weak",
    };
  }

  if (kind === "cpu") {
    const part = catalog.amdIntelPart;
    if (part && hayNorm.includes(part)) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: "CPU AMD/Intel part#" };
    }
    const token = catalog.cpuModelToken;
    if (token && hayNorm.includes(stripSpacesUpper(token))) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: "CPU model token" };
    }
    for (const m of catalog.mpnCandidates) {
      if (isIntelOrderingMpnCandidate(m) && hayNorm.includes(m)) {
        return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: "CPU Intel ordering code" };
      }
    }
    if (token && primaryName.length > 0 && !hayNorm.includes(stripSpacesUpper(token))) {
      const alt = primaryLower.match(/\b(7800x3d|7900x3d|5800x3d|5600x3d|5600x|9950x|9900x)\b/i);
      if (alt && !primaryLower.includes(token.toLowerCase())) {
        return {
          ok: true,
          strong: false,
          medium: false,
          weak: false,
          reject: true,
          rejectReason: `CPU model mismatch (catalog ${token} vs JSON-LD title)`,
          detail: "cpu conflict",
        };
      }
    }
    const socketNorm = catalogInput.socket ? stripSpacesUpper(catalogInput.socket) : "";
    const med = brandOk && socketNorm.length > 0 && hayNorm.includes(socketNorm);
    return {
      ok: true,
      strong: false,
      medium: med,
      weak: brandOk,
      reject: false,
      detail: med ? "CPU brand+socket" : "CPU weak",
    };
  }

  if (kind === "case") {
    const codes = catalog.mpnCandidates.filter((m) => m.includes("FD-"));
    const foundFd = extractMpnLikeTokens(hay).filter((t) => t.includes("FD-"));
    const hit = codes.some((c) => hayNorm.includes(c));
    if (hit) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: "Case FD code match" };
    }
    if (codes.length > 0 && foundFd.length > 0 && !foundFd.some((f) => codes.includes(f))) {
      return {
        ok: true,
        strong: false,
        medium: false,
        weak: false,
        reject: true,
        rejectReason: `Case FD code mismatch (catalog ${codes.join(", ")} vs ${foundFd.join(", ")})`,
        detail: "case conflict",
      };
    }
    const med = brandOk && /\bnorth\b|meshify|define|o11/i.test(hay);
    return {
      ok: true,
      strong: false,
      medium: med,
      weak: brandOk,
      reject: false,
      detail: med ? "Case brand+family" : "Case weak",
    };
  }

  const med = brandOk;
  return {
    ok: true,
    strong: false,
    medium: med,
    weak: med,
    reject: false,
    detail: "Other category: brand only",
  };
}

function capacityMatches(capacityNorm: string | null, hayNorm: string): boolean {
  if (!capacityNorm) return false;
  if (hayNorm.includes(capacityNorm)) return true;
  const tb = capacityNorm.match(/(\d+)\s*TB/i);
  if (tb) {
    const n = tb[1];
    return hayNorm.includes(`${n}TB`) || hayNorm.includes(`${n}ТБ`);
  }
  return false;
}

function memoryGbMatches(gb: number | null, hay: string): boolean {
  if (gb == null) return false;
  const h = hay.toLowerCase();
  return h.includes(`${gb} gb`) || h.includes(`${gb}гб`) || h.includes(`${gb} гб`);
}

function ddrGenMatches(hayNorm: string, input: CatalogMatchInput): boolean {
  const specs = parseJson<Record<string, unknown>>(input.specsJson, {});
  const iface = (input.storageInterface ?? "").toLowerCase();
  const st = JSON.stringify(specs).toLowerCase();
  if (st.includes("ddr5") || iface.includes("ddr5")) return hayNorm.includes("DDR5");
  if (st.includes("ddr4") || iface.includes("ddr4")) return hayNorm.includes("DDR4");
  return false;
}

function computePreviewMatch(input: {
  baseUah: number | null;
  catalog: CatalogMatchInput;
  rozetkaHtml: string;
  telemartHtml: string;
  rozetkaOk: boolean;
  telemartOk: boolean;
  fetchNote: string;
}): PreviewMatchDiagnostics {
  const { baseUah, catalog: ci, rozetkaHtml, telemartHtml, rozetkaOk, telemartOk, fetchNote } = input;

  const identity = buildCatalogIdentity(ci);
  const rz = evaluateSide(identity.kind, identity, ci, rozetkaHtml, rozetkaOk);
  const tm = evaluateSide(identity.kind, identity, ci, telemartHtml, telemartOk);
  const rozetka = toSideDiagnostics("rozetka", rozetkaOk, rz);
  const telemart = toSideDiagnostics("telemart", telemartOk, tm);

  if (baseUah == null) {
    return {
      outcomePath: "no_base_price",
      identity,
      rozetka,
      telemart,
      result: {
        lineStatus: "MANUAL_REVIEW",
        confidence: "NONE",
        matchNote: `No base price from Rozetka/Telemart (missing URLs, fetch error, or unparsed page). ${fetchNote}`.trim(),
      },
    };
  }

  const evaluated = [rz, tm].filter((s) => s.ok);
  const anyReject = evaluated.some((s) => s.reject);
  if (anyReject) {
    const reason = evaluated.find((s) => s.rejectReason)?.rejectReason ?? "Retailer page does not match catalog identity.";
    return {
      outcomePath: "rejected_conflict",
      identity,
      rozetka,
      telemart,
      result: {
        lineStatus: "REJECTED",
        confidence: "NONE",
        matchNote: `${reason} ${fetchNote}`.trim(),
      },
    };
  }

  const bothStrong =
    rz.ok && tm.ok && rz.strong && tm.strong && rozetkaOk && telemartOk;
  const oneStrong = evaluated.some((s) => s.strong);

  if (bothStrong) {
    return {
      outcomePath: "approved_high_both_strong",
      identity,
      rozetka,
      telemart,
      result: {
        lineStatus: "APPROVED_CANDIDATE",
        confidence: "HIGH",
        matchNote: `JSON-LD / identity: strong match on both retailers (${identity.kind}). ${fetchNote}`.trim(),
      },
    };
  }

  if (oneStrong && (rozetkaOk || telemartOk)) {
    return {
      outcomePath: "approved_medium_one_strong",
      identity,
      rozetka,
      telemart,
      result: {
        lineStatus: "APPROVED_CANDIDATE",
        confidence: "MEDIUM",
        matchNote: `Strong identity signal on at least one retailer (${identity.kind}). ${fetchNote}`.trim(),
      },
    };
  }

  const anyMedium = evaluated.some((s) => s.medium);
  if (anyMedium) {
    return {
      outcomePath: "manual_review_medium_only",
      identity,
      rozetka,
      telemart,
      result: {
        lineStatus: "MANUAL_REVIEW",
        confidence: "MEDIUM",
        matchNote: `Partial match (medium signals only). Confirm MPN/model on live pages. ${fetchNote}`.trim(),
      },
    };
  }

  return {
    outcomePath: "manual_review_low_weak",
    identity,
    rozetka,
    telemart,
    result: {
      lineStatus: "MANUAL_REVIEW",
      confidence: "LOW",
      matchNote: `Weak or insufficient identity match for ${identity.kind}. ${fetchNote}`.trim(),
    },
  };
}

export function resolvePreviewMatch(input: {
  baseUah: number | null;
  catalog: CatalogMatchInput;
  rozetkaHtml: string;
  telemartHtml: string;
  rozetkaOk: boolean;
  telemartOk: boolean;
  fetchNote: string;
}): PreviewMatchResult {
  return computePreviewMatch(input).result;
}

export function resolvePreviewMatchDiagnostics(input: {
  baseUah: number | null;
  catalog: CatalogMatchInput;
  rozetkaHtml: string;
  telemartHtml: string;
  rozetkaOk: boolean;
  telemartOk: boolean;
  fetchNote: string;
}): PreviewMatchDiagnostics {
  return computePreviewMatch(input);
}
