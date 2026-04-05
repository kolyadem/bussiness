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
    await tx.product.update({
      where: { id: row.productId },
      data: {
        price: row.previousPriceStored,
        ...(row.newInventoryStatus != null && row.previousInventoryStatus != null
          ? { inventoryStatus: row.previousInventoryStatus }
          : {}),
      },
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
