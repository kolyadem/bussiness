import { displayPriceToStoredMinorUnits } from "@/lib/utils";

/**
 * Final shelf price in the same "display" units used elsewhere (whole currency units
 * before displayPriceToStoredMinorUnits), with +3% markup and integer rounding.
 */
export function markupDisplayPriceUah(baseUah: number): number {
  return Math.round(baseUah * 1.03);
}

export function displayUahToStoredPrice(displayUah: number): number {
  return displayPriceToStoredMinorUnits(displayUah);
}

export function pickBasePrice(
  rozetka: number | null,
  telemart: number | null,
): { baseUah: number | null; baseSource: "ROZETKA" | "TELEMART" | null } {
  if (rozetka == null && telemart == null) {
    return { baseUah: null, baseSource: null };
  }
  if (rozetka != null && telemart != null) {
    if (rozetka <= telemart) {
      return { baseUah: rozetka, baseSource: "ROZETKA" };
    }
    return { baseUah: telemart, baseSource: "TELEMART" };
  }
  if (rozetka != null) {
    return { baseUah: rozetka, baseSource: "ROZETKA" };
  }
  return { baseUah: telemart!, baseSource: "TELEMART" };
}
