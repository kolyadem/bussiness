import type { AppLocale } from "@/lib/constants";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";

export type CompatibilityValue = number | string | string[];

export type CompatibilityProduct = {
  id: string;
  slug: string;
  name: string;
  technicalAttributes?: Record<string, CompatibilityValue>;
};

export type CompatibilityBuildItem = {
  slot: ConfiguratorSlotKey;
  quantity: number;
  product: CompatibilityProduct;
};

export type CompatibilityBuild = {
  itemsBySlot: Record<ConfiguratorSlotKey, CompatibilityBuildItem | null>;
};

export type CompatibilityMode = "filtering" | "final";
export type CompatibilitySeverity = "error" | "warning" | "info";
export type CompatibilityCheckStatus = "passed" | "warning" | "failed" | "skipped";
export type CompatibilityResultStatus = "pass" | "warning" | "fail";

export type CompatibilityDetails = Partial<{
  sourceValue: CompatibilityValue | null;
  targetValue: CompatibilityValue | null;
  requiredValue: CompatibilityValue | null;
  actualValue: CompatibilityValue | null;
  computedValue: number | null;
  thresholdValue: number | null;
}>;

export type CompatibilityCheck = {
  ruleId: string;
  ruleCode: string;
  sourceSlot: ConfiguratorSlotKey;
  targetSlot: ConfiguratorSlotKey;
  severity: CompatibilitySeverity;
  status: CompatibilityCheckStatus;
  messageKey: string;
  message: string;
  details: CompatibilityDetails;
};

export type CompatibilityIssue = CompatibilityCheck;

export type CompatibilitySummary = {
  errorCount: number;
  warningCount: number;
  passedCount: number;
  skippedCount: number;
};

export type CompatibilityResult = {
  status: CompatibilityResultStatus;
  checks: CompatibilityCheck[];
  errors: CompatibilityIssue[];
  warnings: CompatibilityIssue[];
  passedChecks: CompatibilityCheck[];
  summary: CompatibilitySummary;
};

export type CompatibilityEvaluationInput = {
  build: CompatibilityBuild | null;
  locale: AppLocale;
  mode: CompatibilityMode;
  slot?: ConfiguratorSlotKey;
  candidate?: CompatibilityProduct | null;
};

export type CompatibilityRuntimeRuleContext = {
  build: CompatibilityBuild | null;
  itemsBySlot: Record<ConfiguratorSlotKey, CompatibilityBuildItem | null>;
  locale: AppLocale;
  mode: CompatibilityMode;
  slot?: ConfiguratorSlotKey;
  candidate?: CompatibilityProduct | null;
};

export type CompatibilityRuleEvaluator = {
  id: string;
  code: string;
  sourceSlot: ConfiguratorSlotKey;
  targetSlot: ConfiguratorSlotKey;
  supportsFiltering: boolean;
  supportsFinal: boolean;
  affectsSlot(slot: ConfiguratorSlotKey): boolean;
  canEvaluate(context: CompatibilityRuntimeRuleContext): boolean;
  evaluate(context: CompatibilityRuntimeRuleContext): CompatibilityCheck;
};
