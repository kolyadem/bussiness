import { parseJson } from "@/lib/utils";
import { extractJsonLdProductIdentities } from "@/lib/admin/price-updates/fetch-retail";

export type MatchKind = "cpu" | "gpu" | "ssd" | "ram" | "case" | "motherboard" | "other";

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
    case "graphics-cards":
      return "gpu";
    case "storage":
    case "ssd":
      return "ssd";
    case "memory":
      return "ram";
    case "cases":
      return "case";
    case "motherboards":
      return "motherboard";
    default:
      return "other";
  }
}

function stripSpacesUpper(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

const GPU_CLASS_RE = /\b((?:RTX|GTX)\s*\d{4})(?:\s*(Ti))?(?:\s*(Super))?/i;

function extractGpuClassToken(text: string): string | null {
  const m = text.match(GPU_CLASS_RE);
  if (!m) return null;
  let token = m[1]!.replace(/\s+/g, "").toUpperCase();
  if (m[2]) token += "TI";
  if (m[3]) token += "SUPER";
  return token;
}

function textContainsGpuClass(text: string, gpuClass: string): boolean {
  const re = /\b((?:RTX|GTX)\s*\d{4})(?:\s*(Ti))?(?:\s*(Super))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let token = m[1]!.replace(/\s+/g, "").toUpperCase();
    if (m[2]) token += "TI";
    if (m[3]) token += "SUPER";
    if (token === gpuClass) return true;
  }
  return false;
}

const KNOWN_CHIPSETS = new Set([
  "A520", "A620", "B450", "B550", "B560", "B650", "B660", "B760",
  "H410", "H510", "H610", "H670", "X570", "X670", "Z490", "Z590", "Z690", "Z790",
]);

function extractChipsetToken(text: string): string | null {
  const re = /\b([ABXHZ]\d{3})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const tok = m[1]!.toUpperCase();
    if (KNOWN_CHIPSETS.has(tok)) return tok;
  }
  return null;
}

function extractCpuModelToken(text: string): string | null {
  const mX3d = text.match(/\b(\d{4}X3D)\b/i);
  if (mX3d) return mX3d[1]!.toUpperCase();
  const mX = text.match(/\b(\d{4}X)\b/i);
  if (mX) return mX[1]!.toUpperCase();
  const mIntel = text.match(/\b(i[3579]-\d{4,5}[A-Z]{0,2})\b/i);
  if (mIntel) return mIntel[1]!.toUpperCase();
  const mG = text.match(/\b(\d{4}G[E]?)\b/i);
  if (mG) return mG[1]!.toUpperCase();
  const mUltra = text.match(/\bUltra\s+([579])\b/i);
  if (mUltra) return `ULTRA${mUltra[1]}`;
  return null;
}

function ldBrandConflicts(
  catalogBrandSlug: string,
  catalogBrandName: string | null,
  ldBrandName: string,
): boolean {
  const ldNorm = ldBrandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ldNorm.length < 2) return false;
  const slugNorm = catalogBrandSlug.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nameNorm = (catalogBrandName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (ldNorm === slugNorm || ldNorm.includes(slugNorm) || slugNorm.includes(ldNorm)) return false;
  if (nameNorm && (ldNorm === nameNorm || ldNorm.includes(nameNorm) || nameNorm.includes(ldNorm))) return false;
  return true;
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
  gpuClassToken: string | null;
  chipsetToken: string | null;
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
  const mX3d = name.match(/\b(\d{4}X3D)\b/i);
  if (mX3d) {
    cpuModelToken = mX3d[1]!.toUpperCase();
  } else {
    const mX = name.match(/\b(\d{4}X)\b/i);
    if (mX) {
      cpuModelToken = mX[1]!.toUpperCase();
    } else {
      const mIntel = name.match(/\b(i[3579]-\d{4,5}[A-Z]{0,2})\b/i);
      if (mIntel) {
        cpuModelToken = mIntel[1]!.toUpperCase();
      } else {
        const mG = name.match(/\b(\d{4}G[E]?)\b/i);
        if (mG) {
          cpuModelToken = mG[1]!.toUpperCase();
        } else {
          const mUltra = name.match(/\bCore\s*Ultra\s*([579])\b/i);
          if (mUltra) {
            cpuModelToken = `ULTRA${mUltra[1]}`;
          }
        }
      }
    }
  }

  const gpuClassToken = extractGpuClassToken(name);
  const chipsetToken = extractChipsetToken(name);

  return {
    kind,
    mpnCandidates: [...new Set(mpns)],
    cpuModelToken,
    amdIntelPart: amdIntelPart ? stripSpacesUpper(amdIntelPart) : null,
    packagingHint,
    capacityNorm,
    gpuClassToken,
    chipsetToken,
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

  const brandOk = brandMatches(catalogInput.brandSlug, catalogInput.brandNameUk, hay);
  const ldBrandName = ld[0]?.brandName ?? null;
  const skipLdBrandCheck = kind === "gpu";
  const brandConflict =
    !skipLdBrandCheck && ldBrandName
      ? ldBrandConflicts(catalogInput.brandSlug, catalogInput.brandNameUk, ldBrandName)
      : false;

  if (kind === "ssd") {
    const catMpns = catalog.mpnCandidates.filter((m) => m.length >= 6);
    const found = extractMpnLikeTokens(hay).filter((t) => t.startsWith("MZ") || t.startsWith("WDS") || t.startsWith("CT"));
    const catalogHit = catMpns.some((c) => hayNorm.includes(c));
    if (catalogHit) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: `SSD MPN ${catMpns[0]} match` };
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
          detail: `SSD conflict: ${catMpns[0]} vs ${found[0]}`,
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
      detail: med ? `SSD brand + capacity ${catalog.capacityNorm}` : (brandOk ? "SSD brand only" : "SSD: no signals"),
    };
  }

  if (kind === "ram") {
    const catMpns = catalog.mpnCandidates.filter((m) => m.length >= 5);
    const found = extractMpnLikeTokens(hay).filter((t) => t.startsWith("CM") || t.startsWith("KF") || t.startsWith("CT"));
    const hit = catMpns.some((c) => hayNorm.includes(c));
    if (hit) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: `RAM part ${catMpns[0]} match` };
    }
    if (catMpns.length > 0 && found.length > 0 && !found.some((f) => catMpns.includes(f))) {
      return {
        ok: true,
        strong: false,
        medium: false,
        weak: false,
        reject: true,
        rejectReason: `RAM part mismatch (catalog ${catMpns.join(", ")} vs page ${found.join(", ")})`,
        detail: `RAM conflict: ${catMpns[0]} vs ${found[0]}`,
      };
    }
    const med = brandOk && (memoryGbMatches(catalogInput.memoryCapacityGb, hay) || ddrGenMatches(hayNorm, catalogInput));
    return {
      ok: true,
      strong: false,
      medium: med,
      weak: brandOk,
      reject: false,
      detail: med ? "RAM brand + size/gen" : (brandOk ? "RAM brand only" : "RAM: no signals"),
    };
  }

  if (kind === "cpu") {
    const part = catalog.amdIntelPart;
    if (part && hayNorm.includes(part)) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: `CPU part# ${part} match` };
    }
    const token = catalog.cpuModelToken;
    if (token && hayNorm.includes(stripSpacesUpper(token))) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: `CPU model ${token} match` };
    }
    for (const m of catalog.mpnCandidates) {
      if (isIntelOrderingMpnCandidate(m) && hayNorm.includes(m)) {
        return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: `CPU ordering code ${m} match` };
      }
    }
    if (token && primaryName) {
      const ldCpuToken = extractCpuModelToken(primaryName);
      if (ldCpuToken && ldCpuToken !== token) {
        return {
          ok: true,
          strong: false,
          medium: false,
          weak: false,
          reject: true,
          rejectReason: `CPU model mismatch (catalog ${token} vs JSON-LD ${ldCpuToken})`,
          detail: `CPU conflict: ${token} vs ${ldCpuToken}`,
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
      detail: med ? `CPU brand + socket ${catalogInput.socket}` : (brandOk ? "CPU brand only" : "CPU: no signals"),
    };
  }

  if (kind === "gpu") {
    const catalogGpu = catalog.gpuClassToken;
    if (catalogGpu) {
      const ldGpu = primaryName ? extractGpuClassToken(primaryName) : null;
      if (ldGpu === catalogGpu) {
        return {
          ok: true,
          strong: brandOk,
          medium: true,
          weak: true,
          reject: false,
          detail: `GPU ${catalogGpu} confirmed in JSON-LD${brandOk ? " + brand" : ""}`,
        };
      }
      if (ldGpu && ldGpu !== catalogGpu) {
        return {
          ok: true,
          strong: false,
          medium: false,
          weak: false,
          reject: true,
          rejectReason: `GPU class mismatch (catalog ${catalogGpu} vs JSON-LD ${ldGpu})`,
          detail: `GPU conflict: ${catalogGpu} vs ${ldGpu}`,
        };
      }
      if (textContainsGpuClass(hay, catalogGpu)) {
        return {
          ok: true,
          strong: false,
          medium: brandOk,
          weak: true,
          reject: false,
          detail: `GPU ${catalogGpu} in page text${brandOk ? " + brand" : ""}`,
        };
      }
    }
    return {
      ok: true,
      strong: false,
      medium: false,
      weak: brandOk,
      reject: false,
      detail: brandOk ? "GPU brand only, no class signal" : "GPU: no match signals",
    };
  }

  if (kind === "motherboard") {
    const catalogChipset = catalog.chipsetToken;
    if (catalogChipset) {
      const ldChipset = primaryName ? extractChipsetToken(primaryName) : null;
      if (ldChipset === catalogChipset && brandOk) {
        return {
          ok: true,
          strong: false,
          medium: true,
          weak: true,
          reject: false,
          detail: `Mobo chipset ${catalogChipset} + brand in JSON-LD`,
        };
      }
      if (ldChipset && ldChipset !== catalogChipset) {
        return {
          ok: true,
          strong: false,
          medium: false,
          weak: false,
          reject: true,
          rejectReason: `Chipset mismatch (catalog ${catalogChipset} vs JSON-LD ${ldChipset})`,
          detail: `Mobo conflict: ${catalogChipset} vs ${ldChipset}`,
        };
      }
      if (hayNorm.includes(catalogChipset) && brandOk) {
        return {
          ok: true,
          strong: false,
          medium: true,
          weak: true,
          reject: false,
          detail: `Mobo chipset ${catalogChipset} + brand in page text`,
        };
      }
    }
    return {
      ok: true,
      strong: false,
      medium: false,
      weak: brandOk,
      reject: false,
      detail: brandOk ? "Motherboard brand only" : "Motherboard: no signals",
    };
  }

  if (kind === "case") {
    const codes = catalog.mpnCandidates.filter((m) => m.includes("FD-"));
    const foundFd = extractMpnLikeTokens(hay).filter((t) => t.includes("FD-"));
    const hit = codes.some((c) => hayNorm.includes(c));
    if (hit) {
      return { ok: true, strong: true, medium: true, weak: true, reject: false, detail: `Case FD code ${codes[0]} match` };
    }
    if (codes.length > 0 && foundFd.length > 0 && !foundFd.some((f) => codes.includes(f))) {
      return {
        ok: true,
        strong: false,
        medium: false,
        weak: false,
        reject: true,
        rejectReason: `Case FD code mismatch (catalog ${codes.join(", ")} vs ${foundFd.join(", ")})`,
        detail: `Case conflict: ${codes[0]} vs ${foundFd[0]}`,
      };
    }
    const med = brandOk && /\bnorth\b|meshify|define|o11/i.test(hay);
    return {
      ok: true,
      strong: false,
      medium: med,
      weak: brandOk,
      reject: false,
      detail: med ? "Case brand + family" : (brandOk ? "Case brand only" : "Case: no signals"),
    };
  }

  if (brandConflict) {
    return {
      ok: true,
      strong: false,
      medium: false,
      weak: false,
      reject: true,
      rejectReason: `Brand conflict (catalog: ${catalogInput.brandSlug}, JSON-LD: ${ldBrandName})`,
      detail: `brand conflict: ${catalogInput.brandSlug} vs ${ldBrandName}`,
    };
  }
  return {
    ok: true,
    strong: false,
    medium: false,
    weak: brandOk,
    reject: false,
    detail: brandOk ? `${kind}: brand match only` : `${kind}: no match signals`,
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

  const sideInfo = [
    rz.ok ? `Rz: ${rz.detail}` : null,
    tm.ok ? `Tm: ${tm.detail}` : null,
  ].filter(Boolean).join(" | ");

  if (baseUah == null) {
    return {
      outcomePath: "no_base_price",
      identity,
      rozetka,
      telemart,
      result: {
        lineStatus: "MANUAL_REVIEW",
        confidence: "NONE",
        matchNote: `No base price (missing URLs, fetch error, or unparsed page). ${sideInfo ? `[${sideInfo}] ` : ""}${fetchNote}`.trim(),
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
        matchNote: `${reason} [${sideInfo}] ${fetchNote}`.trim(),
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
        matchNote: `Strong match on both (${identity.kind}). ${sideInfo}. ${fetchNote}`.trim(),
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
        matchNote: `Strong signal on 1 retailer (${identity.kind}). ${sideInfo}. ${fetchNote}`.trim(),
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
        matchNote: `Partial match (${identity.kind}). ${sideInfo}. Confirm on live pages. ${fetchNote}`.trim(),
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
      matchNote: `Weak match for ${identity.kind}. ${sideInfo}. ${fetchNote}`.trim(),
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
