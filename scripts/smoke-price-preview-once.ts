/**
 * One-off: set metadata + smoke import key on 5 SKUs, run preview, print lines, restore import keys.
 * Run: npx tsx scripts/smoke-price-preview-once.ts
 */
import "dotenv/config";
import { db } from "@/lib/db";
import { createPricePreviewRun } from "@/lib/admin/price-updates/preview-run";
import { parseJson } from "@/lib/utils";

const SMOKE_KEY = "smoke-price-test-5";

/**
 * Rozetka: canonical /ua/{id}/p{id}/ where verified.
 * If UA Rozetka has no matching product for the catalog SKU, rozetkaUrl is null (preview uses Telemart only).
 */
const TRACKING: Record<string, { rozetkaUrl: string | null; telemartUrl: string }> = {
  "P1-CPU-R55600X": {
    rozetkaUrl: "https://hard.rozetka.com.ua/ua/565363523/p565363523/",
    telemartUrl:
      "https://telemart.ua/ua/products/amd-ryzen-5-5600x-3746ghz-32mb-sam4-box-100-100000065box/",
  },
  "P1-CPU-R77800X3D": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/amd-ryzen-7-7800x3d-4250ghz-96mb-sam5-box-100-100000910wof/",
  },
  "P1-SSD-SAM-990P1T": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/samsung-990-pro-v-nand-3-bit-mlc-1tb-m2-2280-pci-e-nvme-20-mz-v9p1t0bw/",
  },
  "P1-CASE-FD-NORTH": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/fractal-design-north-tempered-glass-bez-bp-fd-c-nor1c-02-charcoal-black/",
  },
  "P1-SSD-WD-SN7701T": {
    rozetkaUrl: null,
    telemartUrl:
      "https://telemart.ua/ua/products/western-digital-black-sn770-1tb-m2-2280-pci-e-nvme-x4-wds100t3x0e/",
  },
};

async function main() {
  const skus = Object.keys(TRACKING);

  const products = await db.product.findMany({
    where: { sku: { in: skus } },
    select: { id: true, sku: true, importSourceKey: true, metadata: true },
  });

  if (products.length !== skus.length) {
    throw new Error(`Expected ${skus.length} products, found ${products.length}. Run phase1 import first.`);
  }

  const backup = products.map((p) => ({ id: p.id, sku: p.sku, importSourceKey: p.importSourceKey }));

  for (const p of products) {
    const meta = parseJson<Record<string, unknown>>(p.metadata, {});
    const pt = TRACKING[p.sku];
    const next = {
      ...meta,
      priceTracking: {
        rozetkaUrl: pt.rozetkaUrl,
        telemartUrl: pt.telemartUrl,
      },
    };
    await db.product.update({
      where: { id: p.id },
      data: {
        importSourceKey: SMOKE_KEY,
        metadata: JSON.stringify(next),
      },
    });
  }

  console.log("Updated metadata.priceTracking + importSourceKey for 5 SKUs.\n");

  const { runId, lineCount } = await createPricePreviewRun({
    createdByUserId: null,
    importSourceKey: SMOKE_KEY,
    limit: 10,
  });

  const lines = await db.priceUpdateLine.findMany({
    where: { runId },
    orderBy: { skuSnapshot: "asc" },
  });

  console.log(JSON.stringify({ runId, lineCount, lines }, null, 2));

  for (const b of backup) {
    await db.product.update({
      where: { id: b.id },
      data: { importSourceKey: b.importSourceKey },
    });
  }

  console.log("\nRestored original importSourceKey on all 5 products.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
