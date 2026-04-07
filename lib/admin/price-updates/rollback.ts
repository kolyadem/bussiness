import { db } from "@/lib/db";

export async function rollbackPriceChangeHistory(input: {
  historyId: string;
  rolledBackByUserId: string;
}) {
  const { historyId, rolledBackByUserId } = input;

  const row = await db.priceChangeHistory.findUnique({
    where: { id: historyId },
  });

  if (!row) {
    throw new Error("History entry not found");
  }
  if (row.rolledBackAt) {
    throw new Error("Already rolled back");
  }

  await db.$transaction(async (tx) => {
    const restoreData: {
      price: number;
      purchasePrice?: number | null;
      inventoryStatus?: string;
    } = {
      price: row.previousPriceStored,
    };

    if (row.previousPurchasePriceStored !== undefined) {
      restoreData.purchasePrice = row.previousPurchasePriceStored;
    }

    if (row.newInventoryStatus != null && row.previousInventoryStatus != null) {
      restoreData.inventoryStatus = row.previousInventoryStatus;
    }

    await tx.product.update({
      where: { id: row.productId },
      data: restoreData,
    });

    await tx.priceChangeHistory.update({
      where: { id: historyId },
      data: {
        rolledBackAt: new Date(),
        rolledBackByUserId,
      },
    });
  });
}
