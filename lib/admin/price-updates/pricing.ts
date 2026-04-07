import { displayPriceToStoredMinorUnits } from "@/lib/utils";

/**
 * Tiered markup rules: lower-priced items get higher markup.
 * `maxUah` is exclusive upper bound (Infinity for the last tier).
 */
const MARKUP_TIERS: ReadonlyArray<{ maxUah: number; percent: number }> = [
  { maxUah: 1_000, percent: 12 },
  { maxUah: 5_000, percent: 7 },
  { maxUah: 10_000, percent: 5 },
  { maxUah: Infinity, percent: 3 },
];

/**
 * Max acceptable divergence between two source prices (percent of the higher one).
 * Above this threshold the line goes to MANUAL_REVIEW.
 */
export const SOURCE_DIVERGENCE_THRESHOLD_PERCENT = 15;

/** Returns the markup percentage for a given base price in display UAH. */
export function getMarkupPercent(baseUah: number): number {
  for (const tier of MARKUP_TIERS) {
    if (baseUah < tier.maxUah) {
      return tier.percent;
    }
  }
  return MARKUP_TIERS[MARKUP_TIERS.length - 1].percent;
}

/**
 * Final shelf price in display UAH (whole currency units), with tiered markup
 * and integer rounding.
 */
export function markupDisplayPriceUah(baseUah: number): number {
  const percent = getMarkupPercent(baseUah);
  return Math.round(baseUah * (1 + percent / 100));
}

export function displayUahToStoredPrice(displayUah: number): number {
  return displayPriceToStoredMinorUnits(displayUah);
}

export type PickBasePriceResult = {
  baseUah: number | null;
  baseSource: "ROZETKA" | "TELEMART" | null;
  sourceDiverged: boolean;
  divergenceNote: string;
};

export function pickBasePrice(
  rozetka: number | null,
  telemart: number | null,
): PickBasePriceResult {
  if (rozetka == null && telemart == null) {
    return { baseUah: null, baseSource: null, sourceDiverged: false, divergenceNote: "" };
  }

  if (rozetka != null && telemart != null) {
    const higher = Math.max(rozetka, telemart);
    const lower = Math.min(rozetka, telemart);
    const divergencePercent = higher > 0 ? ((higher - lower) / higher) * 100 : 0;
    const diverged = divergencePercent > SOURCE_DIVERGENCE_THRESHOLD_PERCENT;

    const chosen = rozetka <= telemart
      ? { baseUah: rozetka, baseSource: "ROZETKA" as const }
      : { baseUah: telemart, baseSource: "TELEMART" as const };

    return {
      ...chosen,
      sourceDiverged: diverged,
      divergenceNote: diverged
        ? `⚠ Rozetka ${rozetka} ₴ vs Telemart ${telemart} ₴ — розходження ${divergencePercent.toFixed(0)}% (поріг ${SOURCE_DIVERGENCE_THRESHOLD_PERCENT}%).`
        : "",
    };
  }

  if (rozetka != null) {
    return { baseUah: rozetka, baseSource: "ROZETKA", sourceDiverged: false, divergenceNote: "" };
  }
  return { baseUah: telemart!, baseSource: "TELEMART", sourceDiverged: false, divergenceNote: "" };
}
