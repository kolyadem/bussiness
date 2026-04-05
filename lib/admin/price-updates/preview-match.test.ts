import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCatalogIdentity,
  buildRetailHaystack,
  extractMpnLikeTokens,
  resolvePreviewMatch,
  type CatalogMatchInput,
} from "@/lib/admin/price-updates/preview-match";
import { extractJsonLdProductIdentities } from "@/lib/admin/price-updates/fetch-retail";

const baseCatalog = (over: Partial<CatalogMatchInput> = {}): CatalogMatchInput => ({
  categorySlug: "storage",
  nameUk: "Samsung 990 PRO 1TB",
  productSlug: "samsung-990-pro-1tb",
  brandSlug: "samsung",
  brandNameUk: "Samsung",
  metadataJson: "{}",
  specsJson: JSON.stringify({ capacity: "1 TB" }),
  socket: null,
  formFactor: null,
  storageInterface: "PCIe 4.0 NVMe",
  memoryCapacityGb: null,
  ...over,
});

test("SSD: strong match when MZ part appears in JSON-LD + haystack", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "SSD Samsung 990 PRO 1TB MZ-V9P1T0BW",
    brand: { "@type": "Brand", name: "Samsung" },
    sku: "123",
    offers: { "@type": "Offer", price: 10000, priceCurrency: "UAH" },
  })}</script>`;
  const c = baseCatalog({
    metadataJson: JSON.stringify({ mpn: "MZ-V9P1T0BW" }),
  });
  const r = resolvePreviewMatch({
    baseUah: 10000,
    catalog: c,
    rozetkaHtml: "",
    telemartHtml: html,
    rozetkaOk: false,
    telemartOk: true,
    fetchNote: "",
  });
  assert.equal(r.lineStatus, "APPROVED_CANDIDATE");
  assert.equal(r.confidence, "MEDIUM");
});

test("SSD: REJECTED when catalog MPN and page show different WDS tokens", () => {
  const hay = `
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "WD Blue SN580",
    offers: { price: 5000, priceCurrency: "UAH" },
  })}</script>
  WDS100T3B0E
  `;
  const c = baseCatalog({
    metadataJson: JSON.stringify({ mpn: "WDS100T3X0E" }),
    nameUk: "WD SN770 1TB",
  });
  const r = resolvePreviewMatch({
    baseUah: 5000,
    catalog: c,
    rozetkaHtml: "",
    telemartHtml: hay,
    rozetkaOk: false,
    telemartOk: true,
    fetchNote: "",
  });
  assert.equal(r.lineStatus, "REJECTED");
});

test("CPU: strong match on Intel ordering code BX807 in haystack", () => {
  const html = `Intel Core i5-13600K Processor BX8071513600K`;
  const c = baseCatalog({
    categorySlug: "processors",
    nameUk: "Intel Core i5-13600K",
    metadataJson: JSON.stringify({
      priceMatch: { primaryMpn: "BX8071513600K" },
    }),
    specsJson: JSON.stringify({ socket: "LGA1700" }),
    socket: "LGA1700",
  });
  const r = resolvePreviewMatch({
    baseUah: 13000,
    catalog: c,
    rozetkaHtml: "",
    telemartHtml: html,
    rozetkaOk: false,
    telemartOk: true,
    fetchNote: "",
  });
  assert.equal(r.lineStatus, "APPROVED_CANDIDATE");
  assert.equal(r.confidence, "MEDIUM");
});

test("CPU: strong match on AMD part number in haystack", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "AMD Ryzen 7 7800X3D",
    offers: { price: 19000, priceCurrency: "UAH" },
  })}</script>
  100-100000910WOF
  `;
  const c = baseCatalog({
    categorySlug: "processors",
    nameUk: "AMD Ryzen 7 7800X3D",
    metadataJson: "{}",
    specsJson: "{}",
  });
  const r = resolvePreviewMatch({
    baseUah: 19000,
    catalog: c,
    rozetkaHtml: html,
    telemartHtml: "",
    rozetkaOk: true,
    telemartOk: false,
    fetchNote: "",
  });
  assert.equal(r.lineStatus, "APPROVED_CANDIDATE");
});

test("Case: FD code strong match", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "Fractal Design North FD-C-NOR1C-02",
    offers: { price: 9000, priceCurrency: "UAH" },
  })}</script>`;
  const c = baseCatalog({
    categorySlug: "cases",
    nameUk: "Fractal North",
    metadataJson: JSON.stringify({ mpn: "FD-C-NOR1C-02" }),
  });
  const r = resolvePreviewMatch({
    baseUah: 9000,
    catalog: c,
    rozetkaHtml: html,
    telemartHtml: "",
    rozetkaOk: true,
    telemartOk: false,
    fetchNote: "",
  });
  assert.equal(r.lineStatus, "APPROVED_CANDIDATE");
});

test("RAM: CM part strong", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "Corsair CMH32GX5M2B5200C36",
    offers: { price: 4000, priceCurrency: "UAH" },
  })}</script>`;
  const c = baseCatalog({
    categorySlug: "memory",
    nameUk: "Corsair DDR5 32GB",
    metadataJson: JSON.stringify({ mpn: "CMH32GX5M2B5200C36" }),
    memoryCapacityGb: 32,
  });
  const r = resolvePreviewMatch({
    baseUah: 4000,
    catalog: c,
    rozetkaHtml: "",
    telemartHtml: html,
    rozetkaOk: false,
    telemartOk: true,
    fetchNote: "",
  });
  assert.equal(r.lineStatus, "APPROVED_CANDIDATE");
});

test("extractMpnLikeTokens finds WDS and MZ", () => {
  const t = extractMpnLikeTokens("Price WDS100T3X0E and MZ-V9P1T0BW");
  assert.ok(t.includes("WDS100T3X0E"));
  assert.ok(t.includes("MZ-V9P1T0BW"));
});

test("buildCatalogIdentity collects MPN from metadata", () => {
  const id = buildCatalogIdentity(
    baseCatalog({
      metadataJson: JSON.stringify({ mpn: "MZ-V9P1T0BW" }),
    }),
  );
  assert.ok(id.mpnCandidates.includes("MZ-V9P1T0BW"));
});

test("JSON-LD identity extraction (fetch-retail) returns Product name", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "Test Product",
    brand: { name: "X" },
  })}</script>`;
  const a = extractJsonLdProductIdentities(html);
  assert.equal(a[0]?.name, "Test Product");
});

test("buildRetailHaystack includes ld+json product name", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "Product",
    name: "Hello SSD",
    offers: { price: 1, priceCurrency: "UAH" },
  })}</script>`;
  const h = buildRetailHaystack(html);
  assert.ok(h.includes("Hello SSD"));
});

test("no base price → MANUAL_REVIEW NONE", () => {
  const r = resolvePreviewMatch({
    baseUah: null,
    catalog: baseCatalog(),
    rozetkaHtml: "",
    telemartHtml: "",
    rozetkaOk: false,
    telemartOk: false,
    fetchNote: "x",
  });
  assert.equal(r.lineStatus, "MANUAL_REVIEW");
  assert.equal(r.confidence, "NONE");
});
