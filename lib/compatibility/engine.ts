import { createCompatibilityRuntimeContext } from "@/lib/compatibility/context";
import { getBuiltinCompatibilityRules } from "@/lib/compatibility/rules/builtin";
import { loadRuntimeCompatibilityRules } from "@/lib/compatibility/rules/runtime";
import type {
  CompatibilityBuild,
  CompatibilityEvaluationInput,
  CompatibilityResult,
  CompatibilityRuleEvaluator,
} from "@/lib/compatibility/types";
import type { AppLocale } from "@/lib/constants";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";

async function getCompatibilityRules() {
  const runtimeRules = await loadRuntimeCompatibilityRules();
  const runtimePairs = new Set(
    runtimeRules.map((rule) => [rule.sourceSlot, rule.targetSlot].sort().join(":")),
  );
  const builtinRules = getBuiltinCompatibilityRules().filter((rule) => {
    const pair = [rule.sourceSlot, rule.targetSlot].sort().join(":");

    if (!runtimePairs.has(pair)) {
      return true;
    }

    return rule.code === "builtin.cooler-case.height" || rule.code === "builtin.psu.sufficiency";
  });

  return [...builtinRules, ...runtimeRules];
}

function summarizeCompatibility(checks: CompatibilityResult["checks"]): CompatibilityResult {
  const errors = checks.filter((check) => check.status === "failed");
  const warnings = checks.filter((check) => check.status === "warning");
  const passedChecks = checks.filter((check) => check.status === "passed");
  const skippedCount = checks.filter((check) => check.status === "skipped").length;

  return {
    status: errors.length > 0 ? "fail" : warnings.length > 0 ? "warning" : "pass",
    checks,
    errors,
    warnings,
    passedChecks,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length,
      passedCount: passedChecks.length,
      skippedCount,
    },
  };
}

function shouldRunRule(rule: CompatibilityRuleEvaluator, input: CompatibilityEvaluationInput) {
  if (input.mode === "filtering" && !rule.supportsFiltering) {
    return false;
  }

  if (input.mode === "final" && !rule.supportsFinal) {
    return false;
  }

  if (input.mode === "filtering" && input.slot) {
    return rule.affectsSlot(input.slot);
  }

  return true;
}

export async function evaluateCompatibility(
  input: CompatibilityEvaluationInput,
  rules?: CompatibilityRuleEvaluator[],
) {
  const runtimeRules = rules ?? (await getCompatibilityRules());
  const context = createCompatibilityRuntimeContext(input);
  const checks = runtimeRules.flatMap((rule) => {
    if (!shouldRunRule(rule, input) || !rule.canEvaluate(context)) {
      return [];
    }

    return [rule.evaluate(context)];
  });

  return summarizeCompatibility(checks);
}

export async function evaluateBuildCompatibility(
  build: CompatibilityBuild | null,
  locale: AppLocale,
  rules?: CompatibilityRuleEvaluator[],
) {
  return evaluateCompatibility(
    {
      build,
      locale,
      mode: "final",
    },
    rules,
  );
}

export async function evaluateCandidateCompatibility(input: {
  build: CompatibilityBuild | null;
  slot: ConfiguratorSlotKey;
  locale: AppLocale;
  candidate: CompatibilityEvaluationInput["candidate"];
  rules?: CompatibilityRuleEvaluator[];
}) {
  return evaluateCompatibility(
    {
      build: input.build,
      slot: input.slot,
      locale: input.locale,
      mode: "filtering",
      candidate: input.candidate,
    },
    input.rules,
  );
}

export async function isCompatibilityFilterAvailable(
  slot: ConfiguratorSlotKey,
  build: CompatibilityBuild | null,
  rules?: CompatibilityRuleEvaluator[],
) {
  if (!build) {
    return false;
  }

  const runtimeRules = rules ?? (await getCompatibilityRules());

  return runtimeRules.some((rule) => {
    if (!rule.supportsFiltering || !rule.affectsSlot(slot)) {
      return false;
    }

    const otherSlot = rule.sourceSlot === slot ? rule.targetSlot : rule.sourceSlot;
    return Boolean(build.itemsBySlot[otherSlot]?.product);
  });
}

export async function getCompatibilityRulesForRequest() {
  return getCompatibilityRules();
}
