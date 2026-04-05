import type {
  CompatibilityBuild,
  CompatibilityEvaluationInput,
  CompatibilityRuntimeRuleContext,
} from "@/lib/compatibility/types";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";
import { getConfiguratorSlots } from "@/lib/storefront/configurator";

function buildItemsWithCandidate(input: CompatibilityEvaluationInput) {
  const base =
    input.build?.itemsBySlot ??
    Object.fromEntries(
      getConfiguratorSlots().map((slot) => [slot.key, null]),
    );

  const itemsBySlot = { ...base } as CompatibilityBuild["itemsBySlot"];

  if (input.slot && input.candidate) {
    itemsBySlot[input.slot] = {
      slot: input.slot,
      quantity: 1,
      product: input.candidate,
    };
  }

  return itemsBySlot;
}

export function createCompatibilityRuntimeContext(
  input: CompatibilityEvaluationInput,
): CompatibilityRuntimeRuleContext {
  return {
    build: input.build,
    itemsBySlot: buildItemsWithCandidate(input),
    locale: input.locale,
    mode: input.mode,
    slot: input.slot,
    candidate: input.candidate,
  };
}

export function slotParticipatesInCheck(
  slot: ConfiguratorSlotKey,
  sourceSlot: ConfiguratorSlotKey,
  targetSlot: ConfiguratorSlotKey,
) {
  return slot === sourceSlot || slot === targetSlot;
}
