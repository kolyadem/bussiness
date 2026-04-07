import { candidateToProductInventoryStatus } from "@/lib/admin/price-updates/availability-candidate";
import { displayUahToStoredPrice } from "@/lib/admin/price-updates/pricing";
import { db } from "@/lib/db";

export type ApplyRunResult = {
  appliedCount: number;
  skippedStale: Array<{ lineId: string; sku: string; reason: string }>;
};

export async function applyApprovedPriceLines(input: {
  runId: string;
  appliedByUserId: string;
}): Promise<ApplyRunResult> {
  const { runId, appliedByUserId } = input;

  const run = await db.priceUpdateRun.findUnique({
    where: { id: runId },
  });

  if (!run) {
    throw new Error("Run not found");
  }
  if (run.status !== "PREVIEW_READY") {
    throw new Error(`Run is not in PREVIEW_READY status (current: ${run.status})`);
  }

  const lines = await db.priceUpdateLine.findMany({
    where: {
      runId,
      userApproved: true,
      newPriceStored: { not: null },
    },
  });

  if (lines.length === 0) {
    throw new Error("No approved lines with a computed new price");
  }

  const skippedStale: ApplyRunResult["skippedStale"] = [];
  let appliedCount = 0;

  await db.$transaction(async (tx) => {
    for (const line of lines) {
      const product = await tx.product.findUnique({
        where: { id: line.productId },
      });

      if (!product) {
        skippedStale.push({ lineId: line.id, sku: line.skuSnapshot, reason: "Product missing" });
        continue;
      }

      if (product.price !== line.priceBeforeStored) {
        skippedStale.push({
          lineId: line.id,
          sku: line.skuSnapshot,
          reason: "Current price changed since preview (stale snapshot)",
        });
        continue;
      }

      const invTarget = candidateToProductInventoryStatus(
        line.candidateAvailability as "in_stock" | "out_of_stock" | "unknown",
      );

      const purchasePriceStored =
        line.basePriceUah != null ? displayUahToStoredPrice(line.basePriceUah) : null;

      const updateData: { price: number; purchasePrice?: number; inventoryStatus?: string } = {
        price: line.newPriceStored!,
      };

      if (purchasePriceStored != null) {
        updateData.purchasePrice = purchasePriceStored;
      }

      let previousInventoryStatus: string | null = null;
      let newInventoryStatus: string | null = null;

      if (invTarget) {
        if (product.inventoryStatus === line.inventoryStatusSnapshot) {
          if (product.inventoryStatus !== invTarget) {
            updateData.inventoryStatus = invTarget;
            previousInventoryStatus = product.inventoryStatus;
            newInventoryStatus = invTarget;
          }
        } else {
          skippedStale.push({
            lineId: line.id,
            sku: line.skuSnapshot,
            reason: "Inventory changed since preview — price applied, availability skipped",
          });
        }
      }

      await tx.product.update({
        where: { id: product.id },
        data: updateData,
      });

      await tx.priceChangeHistory.create({
        data: {
          runId: run.id,
          lineId: line.id,
          productId: product.id,
          previousPriceStored: line.priceBeforeStored,
          newPriceStored: line.newPriceStored!,
          previousPurchasePriceStored: product.purchasePrice,
          newPurchasePriceStored: purchasePriceStored,
          previousInventoryStatus,
          newInventoryStatus,
          appliedByUserId,
        },
      });

      await tx.priceUpdateLine.update({
        where: { id: line.id },
        data: { appliedAt: new Date() },
      });

      appliedCount += 1;
    }

    if (appliedCount === 0) {
      throw new Error(
        "No rows applied (stale prices or missing products). Fix data and re-run preview, or adjust approvals.",
      );
    }

    await tx.priceUpdateRun.update({
      where: { id: runId },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        appliedByUserId,
      },
    });
  });

  return { appliedCount, skippedStale };
}
