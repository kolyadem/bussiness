/**
 * Live matcher dry-run: loads 14 phase1 catalog products from DB, fetches retailer HTML
 * using verified Telemart/Rozetka URLs (in-memory overrides; does not write Product.metadata).
 *
 * Run: npx tsx scripts/preview-live-phase1-sample.ts
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { fetchRetailPage } from "@/lib/admin/price-updates/fetch-retail";
import { pickBasePrice } from "@/lib/admin/price-updates/pricing";
import {
  resolvePreviewMatchDiagnostics,
  type CatalogMatchInput,
  type PreviewMatchOutcomePath,
  type PreviewMatchSideDiagnostics,
} from "@/lib/admin/price-updates/preview-match";

const PHASE1_KEY = "phase1-mini-batch-v1";

/** Verified retailer pages for this QA run (catalog rows rarely ship with metadata.priceTracking). */
const URL_OVERRIDES: Record<string, { rozetkaUrl: string | null; telemartUrl: string | null }> = {
  "P1-CPU-R55600X": {
    rozetkaUrl: "https://hard.rozetka.com.ua/ua/565363523/p565363523/",
    telemartUrl: "https://telemart.ua/ua/products/amd-ryzen-5-5600x-3746ghz-32mb-sam4-box-100-100000065box/",
  },
  "P1-CPU-R75800X3D": {
    rozetkaUrl: null,
    telemartUrl: "https://telemart.ua/ua/products/amd-ryzen-7-5800x3d-3445ghz-96mb-sam4-tray/",
  },
  "P1-CPU-R77800X3D": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/amd-ryzen-7-7800x3d-4250ghz-96mb-sam5-box-100-100000910wof/",
  },
  "P1-CPU-I513600K": {
    rozetkaUrl: null,
    telemartUrl: "https://telemart.ua/ua/products/intel-core-i5-13600k-3951ghz-24mb-s1700-box-bx8071513600k/",
  },
  "P1-CPU-I714700K": {
    rozetkaUrl: null,
    telemartUrl: "https://telemart.ua/ua/products/intel-core-i7-14700k-3456ghz-33mb-s1700-box-bx8071514700k/",
  },
  "P1-SSD-SAM-990P1T": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/samsung-990-pro-v-nand-3-bit-mlc-1tb-m2-2280-pci-e-nvme-20-mz-v9p1t0bw/",
  },
  "P1-SSD-WD-SN7701T": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/western-digital-black-sn770-1tb-m2-2280-pci-e-nvme-x4-wds100t3x0e/",
  },
  "P1-SSD-CRU-MX5001T": {
    rozetkaUrl: null,
    telemartUrl: "https://telemart.ua/ua/products/crucial-mx500-tlc-1tb-25-ct1000mx500ssd1/",
  },
  "P1-RAM-CMK32-5600": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/corsair-ddr5-32gb-2x16gb-5600mhz-vengeance-black-cmk32gx5m2b5600c36/",
  },
  "P1-RAM-CMH32-6400": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/corsair-ddr5-32gb-2x16gb-6400mhz-vengeance-rgb-black-cmh32gx5m2b6400c32/",
  },
  "P1-RAM-CMK64-5200": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/corsair-ddr5-64gb-2x32gb-5200mhz-vengeance-white-cmk64gx5m2b5200c40w/",
  },
  "P1-CASE-FD-NORTH": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/fractal-design-north-tempered-glass-bez-bp-fd-c-nor1c-02-charcoal-black/",
  },
  "P1-CASE-NZXT-H7F": {
    rozetkaUrl: null,
    telemartUrl: "https://telemart.ua/ua/products/nzxt-h7-flow-bez-bp-cm-h72fb-01-black/",
  },
  "P1-CASE-LL-O11EVO": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/lian-li-o11-dynamic-evo-tempered-glass-bez-bp-g99o11dex00-black/",
  },
};

const SAMPLE_SKUS = Object.keys(URL_OVERRIDES);

function signalLevel(s: PreviewMatchSideDiagnostics): string {
  if (!s.ok) return "—";
  const parts: string[] = [];
  if (s.strong) parts.push("strong");
  if (s.medium) parts.push("medium");
  if (s.weak) parts.push("weak");
  if (parts.length === 0) return "—";
  return parts.join(" + ");
}

function outcomeExplanation(path: PreviewMatchOutcomePath): string {
  switch (path) {
    case "no_base_price":
      return "Немає базової ціни (обидва парсери дали null / немає URL / помилка мережі).";
    case "rejected_conflict":
      return "Конфлікт ідентичності на стороні ритейлера (різні MPN/модель vs каталог) → REJECTED.";
    case "approved_high_both_strong":
      return "Обидва ритейлери з ціною + strong-сигнал на кожному → APPROVED HIGH.";
    case "approved_medium_one_strong":
      return "Щонайменше один ритейлер дав strong-сигнал → APPROVED MEDIUM.";
    case "manual_review_medium_only":
      return "Є лише medium (без strong) → MANUAL MEDIUM.";
    case "manual_review_low_weak":
      return "Лише weak / недостатньо сигналів → MANUAL LOW.";
    default:
      return path;
  }
}

async function main() {
  const products = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      importSourceKey: PHASE1_KEY,
      sku: { in: SAMPLE_SKUS },
    },
    include: {
      translations: { where: { locale: "uk" }, take: 1 },
      category: true,
      brand: { include: { translations: { where: { locale: "uk" }, take: 1 } } },
    },
    orderBy: { sku: "asc" },
  });

  if (products.length !== SAMPLE_SKUS.length) {
    const found = new Set(products.map((p) => p.sku));
    const missing = SAMPLE_SKUS.filter((s) => !found.has(s));
    throw new Error(
      `Expected ${SAMPLE_SKUS.length} products (${PHASE1_KEY}), got ${products.length}. Missing: ${missing.join(", ")}`,
    );
  }

  const rows: {
    sku: string;
    name: string;
    category: string;
    rozetkaUrl: string | null;
    telemartUrl: string | null;
    rozetkaPriceUah: number | null;
    telemartPriceUah: number | null;
    baseUah: number | null;
    diag: ReturnType<typeof resolvePreviewMatchDiagnostics>;
    fetchNote: string;
  }[] = [];

  for (const p of products) {
    const name = p.translations[0]?.name ?? p.sku;
    const ov = URL_OVERRIDES[p.sku]!;
    const rozetkaUrl = ov.rozetkaUrl;
    const telemartUrl = ov.telemartUrl;

    let rozetkaPriceUah: number | null = null;
    let telemartPriceUah: number | null = null;
    let rozetkaHtml = "";
    let telemartHtml = "";
    let fetchNote = "";

    if (rozetkaUrl) {
      const r = await fetchRetailPage(rozetkaUrl);
      rozetkaPriceUah = r.uah;
      rozetkaHtml = r.html;
      if (r.error) fetchNote += `Rozetka: ${r.error}. `;
    }
    if (telemartUrl) {
      const t = await fetchRetailPage(telemartUrl);
      telemartPriceUah = t.uah;
      telemartHtml = t.html;
      if (t.error) fetchNote += `Telemart: ${t.error}. `;
    }
    if (!rozetkaUrl && !telemartUrl) {
      fetchNote = "No retailer URLs.";
    }

    const { baseUah } = pickBasePrice(rozetkaPriceUah, telemartPriceUah);
    const rozetkaOk = rozetkaPriceUah != null;
    const telemartOk = telemartPriceUah != null;

    const catalogInput: CatalogMatchInput = {
      categorySlug: p.category.slug,
      nameUk: name,
      productSlug: p.slug,
      brandSlug: p.brand.slug,
      brandNameUk: p.brand.translations[0]?.name ?? null,
      metadataJson: p.metadata,
      specsJson: p.specs,
      socket: p.socket,
      formFactor: p.formFactor,
      storageInterface: p.storageInterface,
      memoryCapacityGb: p.memoryCapacityGb,
    };

    const diag = resolvePreviewMatchDiagnostics({
      baseUah,
      catalog: catalogInput,
      rozetkaHtml,
      telemartHtml,
      rozetkaOk,
      telemartOk,
      fetchNote: fetchNote.trim(),
    });

    rows.push({
      sku: p.sku,
      name,
      category: p.category.slug,
      rozetkaUrl,
      telemartUrl,
      rozetkaPriceUah,
      telemartPriceUah,
      baseUah,
      diag,
      fetchNote: fetchNote.trim(),
    });
  }

  console.log("=== Live preview sample (phase1, no DB writes, no apply) ===\n");
  console.log(`Import source: ${PHASE1_KEY}`);
  console.log(`Products: ${rows.length}\n`);

  for (const r of rows) {
    const { result, identity, rozetka, telemart, outcomePath } = r.diag;
    console.log("—".repeat(72));
    console.log(`[${identity.kind.toUpperCase()}] ${r.sku}`);
    console.log(`  Product: ${r.name}`);
    console.log(`  Category: ${r.category}`);
    console.log(`  Rozetka URL: ${r.rozetkaUrl ?? "—"}`);
    console.log(`  Telemart URL: ${r.telemartUrl ?? "—"}`);
    console.log(
      `  Parsed UAH: Rozetka ${r.rozetkaPriceUah ?? "—"} | Telemart ${r.telemartPriceUah ?? "—"} | base ${r.baseUah ?? "—"}`,
    );
    if (r.fetchNote) console.log(`  Fetch notes: ${r.fetchNote}`);
    console.log(`  lineStatus: ${result.lineStatus}`);
    console.log(`  confidence: ${result.confidence}`);
    console.log(`  matchNote: ${result.matchNote}`);
    console.log(
      `  Identity: kind=${identity.kind} mpns=[${identity.mpnCandidates.slice(0, 6).join(", ")}${identity.mpnCandidates.length > 6 ? "…" : ""}] cpuToken=${identity.cpuModelToken ?? "—"} amdIntel=${identity.amdIntelPart ?? "—"} cap=${identity.capacityNorm ?? "—"}`,
    );
    console.log(
      `  Rozetka signals: ${signalLevel(rozetka)} | ok=${rozetka.ok} | ${rozetka.detail}${rozetka.reject ? ` | REJECT: ${rozetka.rejectReason ?? ""}` : ""}`,
    );
    console.log(
      `  Telemart signals: ${signalLevel(telemart)} | ok=${telemart.ok} | ${telemart.detail}${telemart.reject ? ` | REJECT: ${telemart.rejectReason ?? ""}` : ""}`,
    );
    console.log(`  Outcome path: ${outcomePath}`);
    console.log(`  Why: ${outcomeExplanation(outcomePath)}`);
    console.log("");
  }

  const approved = rows.filter((r) => r.diag.result.lineStatus === "APPROVED_CANDIDATE");
  const manual = rows.filter((r) => r.diag.result.lineStatus === "MANUAL_REVIEW");
  const rejected = rows.filter((r) => r.diag.result.lineStatus === "REJECTED");

  console.log("=".repeat(72));
  console.log("SUMMARY");
  console.log(`  APPROVED_CANDIDATE: ${approved.length}`);
  console.log(`  MANUAL_REVIEW:     ${manual.length}`);
  console.log(`  REJECTED:          ${rejected.length}`);

  const rejectReasons: Record<string, number> = {};
  for (const r of rejected) {
    const key = r.diag.result.matchNote.split("Rozetka:")[0]!.trim().slice(0, 120);
    rejectReasons[key] = (rejectReasons[key] ?? 0) + 1;
  }
  console.log("\n  Top REJECTED reasons (by matchNote prefix):");
  Object.entries(rejectReasons)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`    ×${n} ${k}`));

  const manualBuckets: Record<string, number> = {};
  for (const r of manual) {
    const k = r.diag.outcomePath;
    manualBuckets[k] = (manualBuckets[k] ?? 0) + 1;
  }
  console.log("\n  MANUAL_REVIEW by outcomePath:");
  Object.entries(manualBuckets)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log(`    ×${n} ${k} — ${outcomeExplanation(k as PreviewMatchOutcomePath)}`));

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
