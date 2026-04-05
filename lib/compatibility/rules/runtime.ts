import { db } from "@/lib/db";
import { getCompatibilityList, getCompatibilityNumber, getCompatibilityString } from "@/lib/compatibility/attributes";
import { slotParticipatesInCheck } from "@/lib/compatibility/context";
import { finalizeCompatibilityCheck } from "@/lib/compatibility/messages";
import type {
  CompatibilityCheck,
  CompatibilityRuleEvaluator,
  CompatibilityRuntimeRuleContext,
} from "@/lib/compatibility/types";
import { isConfiguratorSlotKey, type ConfiguratorSlotKey } from "@/lib/storefront/configurator";

type RuntimeRuleRecord = Awaited<ReturnType<typeof loadCompatibilityRuleRecords>>[number];

function createSkippedCheck(
  context: CompatibilityRuntimeRuleContext,
  rule: RuntimeRuleRecord,
) {
  return finalizeCompatibilityCheck(
    {
      ruleId: rule.id,
      ruleCode: rule.code,
      sourceSlot: rule.sourceSlot as ConfiguratorSlotKey,
      targetSlot: rule.targetSlot as ConfiguratorSlotKey,
      severity: rule.severity === "WARNING" ? "warning" : "error",
      status: "skipped",
      messageKey: rule.messageKey,
      details: {},
    },
    context.locale,
  );
}

function getAttributeValue(
  context: CompatibilityRuntimeRuleContext,
  slot: ConfiguratorSlotKey,
  code: string | null,
) {
  if (!code) {
    return null;
  }

  const product = context.itemsBySlot[slot]?.product ?? null;
  const listValue = getCompatibilityList(product, code);

  if (listValue.length > 0) {
    return listValue;
  }

  const numberValue = getCompatibilityNumber(product, code);

  if (typeof numberValue === "number") {
    return numberValue;
  }

  return getCompatibilityString(product, code);
}

function compileRule(rule: RuntimeRuleRecord): CompatibilityRuleEvaluator | null {
  if (!isConfiguratorSlotKey(rule.sourceSlot) || !isConfiguratorSlotKey(rule.targetSlot)) {
    return null;
  }

  const sourceSlot = rule.sourceSlot;
  const targetSlot = rule.targetSlot;

  return {
    id: rule.id,
    code: rule.code,
    sourceSlot,
    targetSlot,
    supportsFiltering: true,
    supportsFinal: true,
    affectsSlot(slot) {
      return slotParticipatesInCheck(slot, sourceSlot, targetSlot);
    },
    canEvaluate(context) {
      return Boolean(context.itemsBySlot[sourceSlot]?.product && context.itemsBySlot[targetSlot]?.product);
    },
    evaluate(context): CompatibilityCheck {
      const sourceValue =
        getAttributeValue(context, sourceSlot, rule.sourceAttribute?.code ?? null) ??
        (rule.sourceValue ? rule.sourceValue.trim().toLowerCase() : null);
      const targetValue =
        getAttributeValue(context, targetSlot, rule.targetAttribute?.code ?? null) ??
        (rule.targetValue ? rule.targetValue.trim().toLowerCase() : null);

      if (sourceValue === null || targetValue === null) {
        return createSkippedCheck(context, rule);
      }

      let status: CompatibilityCheck["status"] = "failed";

      switch (rule.comparator) {
        case "EQUALS":
          status = sourceValue === targetValue ? "passed" : "failed";
          break;
        case "SOURCE_INCLUDES_TARGET":
          status =
            Array.isArray(sourceValue) &&
            typeof targetValue === "string" &&
            sourceValue.includes(targetValue)
              ? "passed"
              : "failed";
          break;
        case "TARGET_INCLUDES_SOURCE":
          status =
            Array.isArray(targetValue) &&
            typeof sourceValue === "string" &&
            targetValue.includes(sourceValue)
              ? "passed"
              : "failed";
          break;
        case "LTE":
          status =
            typeof sourceValue === "number" &&
            typeof targetValue === "number" &&
            sourceValue <= targetValue
              ? "passed"
              : "failed";
          break;
        case "GTE":
          status =
            typeof sourceValue === "number" &&
            typeof targetValue === "number" &&
            sourceValue >= targetValue
              ? "passed"
              : "failed";
          break;
        default:
          return createSkippedCheck(context, rule);
      }

      return finalizeCompatibilityCheck(
        {
          ruleId: rule.id,
          ruleCode: rule.code,
          sourceSlot,
          targetSlot,
          severity: rule.severity === "WARNING" ? "warning" : "error",
          status,
          messageKey: rule.messageKey,
          details: {
            sourceValue,
            targetValue,
          },
        },
        context.locale,
      );
    },
  };
}

export async function loadCompatibilityRuleRecords() {
  return db.compatibilityRule.findMany({
    include: {
      sourceAttribute: {
        select: {
          code: true,
        },
      },
      targetAttribute: {
        select: {
          code: true,
        },
      },
    },
    orderBy: {
      code: "asc",
    },
  });
}

export async function loadRuntimeCompatibilityRules() {
  const records = await loadCompatibilityRuleRecords();
  return records.map(compileRule).filter(Boolean) as CompatibilityRuleEvaluator[];
}
