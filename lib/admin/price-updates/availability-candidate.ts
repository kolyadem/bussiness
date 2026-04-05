import type { RetailAvailabilityLevel } from "@/lib/admin/price-updates/fetch-retail";

export type { RetailAvailabilityLevel };

/**
 * Merges per-retailer availability into a single candidate (conservative rules).
 */
export function mergeRetailAvailabilityCandidate(input: {
  rozetka: RetailAvailabilityLevel;
  telemart: RetailAvailabilityLevel;
  hasRozetkaUrl: boolean;
  hasTelemartUrl: boolean;
}): { candidate: RetailAvailabilityLevel; rationale: string } {
  const { rozetka, telemart, hasRozetkaUrl, hasTelemartUrl } = input;

  const r = hasRozetkaUrl ? rozetka : ("unknown" as const);
  const t = hasTelemartUrl ? telemart : ("unknown" as const);

  if (!hasRozetkaUrl && !hasTelemartUrl) {
    return { candidate: "unknown", rationale: "No priceTracking retailer URLs" };
  }

  if (hasRozetkaUrl && !hasTelemartUrl) {
    if (r === "in_stock") {
      return { candidate: "in_stock", rationale: "Rozetka only: in_stock" };
    }
    if (r === "out_of_stock") {
      return {
        candidate: "unknown",
        rationale: "Rozetka only: out_of_stock (needs two sources to apply)",
      };
    }
    return { candidate: "unknown", rationale: "Rozetka only: insufficient signal" };
  }

  if (!hasRozetkaUrl && hasTelemartUrl) {
    if (t === "in_stock") {
      return { candidate: "in_stock", rationale: "Telemart only: in_stock" };
    }
    if (t === "out_of_stock") {
      return {
        candidate: "unknown",
        rationale: "Telemart only: out_of_stock (needs two sources to apply)",
      };
    }
    return { candidate: "unknown", rationale: "Telemart only: insufficient signal" };
  }

  if (r === "in_stock" && t === "in_stock") {
    return { candidate: "in_stock", rationale: "Both retailers: in_stock" };
  }
  if (r === "out_of_stock" && t === "out_of_stock") {
    return { candidate: "out_of_stock", rationale: "Both retailers: out_of_stock" };
  }
  if ((r === "in_stock" && t === "unknown") || (r === "unknown" && t === "in_stock")) {
    return { candidate: "in_stock", rationale: "in_stock + unknown" };
  }
  if ((r === "out_of_stock" && t === "unknown") || (r === "unknown" && t === "out_of_stock")) {
    return { candidate: "unknown", rationale: "out_of_stock + unknown" };
  }
  if (
    (r === "in_stock" && t === "out_of_stock") ||
    (r === "out_of_stock" && t === "in_stock")
  ) {
    return { candidate: "unknown", rationale: "Conflict in_stock vs out_of_stock" };
  }
  return { candidate: "unknown", rationale: "Both retailers: insufficient signal" };
}

export function candidateToProductInventoryStatus(
  candidate: RetailAvailabilityLevel,
): "IN_STOCK" | "OUT_OF_STOCK" | null {
  if (candidate === "in_stock") return "IN_STOCK";
  if (candidate === "out_of_stock") return "OUT_OF_STOCK";
  return null;
}
