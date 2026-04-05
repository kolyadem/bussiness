/**
 * One-off: merge metadata.priceTracking.telemartUrl for known SKUs (admin price preview).
 * Safe: preserves other metadata keys. Run: npx tsx scripts/patch-price-tracking-metadata.ts
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { parseJson } from "@/lib/utils";

const PATCH: Record<string, { telemartUrl: string }> = {
  "CASE-COR-4000D": {
    telemartUrl:
      "https://telemart.ua/ua/products/corsair-4000d-airflow-tempered-glass-bez-bp-cc-9011200-ww-black/",
  },
  "CASE-NZX-H5FLOW": {
    telemartUrl: "https://telemart.ua/ua/products/nzxt-h5-flow-bez-bp-cc-h52fb-01-black/",
  },
  "COOL-COR-A115": {
    telemartUrl: "https://telemart.ua/products/corsair-a115-ct-9010011-ww-black/",
  },
  "COL-DPC-AK620": {
    telemartUrl: "https://telemart.ua/ua/products/deepcool-ak620/",
  },
};

async function main() {
  for (const [sku, tracking] of Object.entries(PATCH)) {
    const product = await db.product.findUnique({ where: { sku } });
    if (!product) {
      console.warn(`[patch-price-tracking] SKU not found, skip: ${sku}`);
      continue;
    }
    const meta = parseJson<Record<string, unknown>>(product.metadata, {});
    const existingPt = meta.priceTracking;
    const mergedPt =
      existingPt && typeof existingPt === "object" && !Array.isArray(existingPt)
        ? { ...(existingPt as Record<string, unknown>), ...tracking }
        : tracking;
    meta.priceTracking = mergedPt;
    await db.product.update({
      where: { id: product.id },
      data: { metadata: JSON.stringify(meta) },
    });
    console.log(`[patch-price-tracking] updated ${sku}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
