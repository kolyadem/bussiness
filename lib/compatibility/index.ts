export {
  evaluateBuildCompatibility,
  evaluateCandidateCompatibility,
  getCompatibilityRulesForRequest,
  isCompatibilityFilterAvailable,
} from "@/lib/compatibility/engine";
export type {
  CompatibilityBuild,
  CompatibilityCheck,
  CompatibilityIssue,
  CompatibilityProduct,
  CompatibilityResult,
} from "@/lib/compatibility/types";
