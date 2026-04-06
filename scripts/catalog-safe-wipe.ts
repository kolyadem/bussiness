/**
 * Controlled catalog wipe (Stage 1): removes all products without breaking orders.
 *
 * Requires explicit confirmation — see package.json script `catalog:safe-wipe`.
 *
 * Order: SiteSettings.featuredProductIds → [] → delete all PcBuildItem → reset PcBuild.totalPrice → delete all Product.
 * OrderItem.productId uses onDelete: SetNull — orders stay valid.
 *
 * Backup the database before running against production-like data.
 */
import "dotenv/config";
import { db as prisma } from "@/lib/db";

function isConfirmed() {
  return (
    process.argv.includes("--yes") ||
    process.env.CATALOG_SAFE_WIPE_CONFIRM === "1" ||
    process.env.CATALOG_SAFE_WIPE_CONFIRM === "yes"
  );
}

async function main() {
  if (!isConfirmed()) {
    console.error(
      [
        "[catalog-safe-wipe] Refused: this will DELETE ALL PRODUCTS.",
        "  Backup your Postgres database (dump or Neon branch) if needed.",
        "  Then run with:  npm run catalog:safe-wipe -- --yes",
        "  or set: CATALOG_SAFE_WIPE_CONFIRM=1",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.warn(
    "[catalog-safe-wipe] Starting transactional wipe (featured ids → PcBuildItem → PcBuild totals → Product)...",
  );

  const before = await prisma.product.count();

  const result = await prisma.$transaction(async (tx) => {
    const settings = await tx.siteSettings.updateMany({
      data: { featuredProductIds: "[]" },
    });

    const buildItems = await tx.pcBuildItem.deleteMany({});

    const buildsReset = await tx.pcBuild.updateMany({
      data: { totalPrice: 0 },
    });

    const products = await tx.product.deleteMany({});

    return {
      siteSettingsRowsUpdated: settings.count,
      pcBuildItemsDeleted: buildItems.count,
      pcBuildsTouched: buildsReset.count,
      productsDeleted: products.count,
    };
  });

  console.log("[catalog-safe-wipe] Done:", result);
  console.log(`[catalog-safe-wipe] Products before: ${before}, deleted: ${result.productsDeleted}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
