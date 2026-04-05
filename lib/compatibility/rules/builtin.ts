import { getCompatibilityList, getCompatibilityNumber, getCompatibilityString } from "@/lib/compatibility/attributes";
import { slotParticipatesInCheck } from "@/lib/compatibility/context";
import { finalizeCompatibilityCheck } from "@/lib/compatibility/messages";
import type {
  CompatibilityCheck,
  CompatibilityRuleEvaluator,
  CompatibilityRuntimeRuleContext,
} from "@/lib/compatibility/types";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";

function createSkippedCheck(
  context: CompatibilityRuntimeRuleContext,
  config: {
    id: string;
    code: string;
    sourceSlot: ConfiguratorSlotKey;
    targetSlot: ConfiguratorSlotKey;
    severity: "error" | "warning" | "info";
    messageKey: string;
  },
) {
  return finalizeCompatibilityCheck(
    {
      ruleId: config.id,
      ruleCode: config.code,
      sourceSlot: config.sourceSlot,
      targetSlot: config.targetSlot,
      severity: config.severity,
      status: "skipped",
      messageKey: config.messageKey,
      details: {},
    },
    context.locale,
  );
}

function createRule(config: {
  id: string;
  code: string;
  sourceSlot: ConfiguratorSlotKey;
  targetSlot: ConfiguratorSlotKey;
  supportsFiltering?: boolean;
  supportsFinal?: boolean;
  canEvaluate(context: CompatibilityRuntimeRuleContext): boolean;
  evaluate(context: CompatibilityRuntimeRuleContext): CompatibilityCheck;
}) {
  const supportsFiltering = config.supportsFiltering ?? true;
  const supportsFinal = config.supportsFinal ?? true;

  return {
    ...config,
    supportsFiltering,
    supportsFinal,
    affectsSlot(slot) {
      return slotParticipatesInCheck(slot, config.sourceSlot, config.targetSlot);
    },
  } satisfies CompatibilityRuleEvaluator;
}

function roundUpToStep(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

export function getBuiltinCompatibilityRules() {
  return [
    createRule({
      id: "builtin-cpu-motherboard-socket",
      code: "builtin.cpu-motherboard.socket",
      sourceSlot: "cpu",
      targetSlot: "motherboard",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.cpu?.product && context.itemsBySlot.motherboard?.product);
      },
      evaluate(context) {
        const cpu = context.itemsBySlot.cpu?.product ?? null;
        const motherboard = context.itemsBySlot.motherboard?.product ?? null;
        const cpuSocket = getCompatibilityString(cpu, "cpu.socket");
        const motherboardSocket = getCompatibilityString(motherboard, "motherboard.socket");

        if (!cpuSocket || !motherboardSocket) {
          return createSkippedCheck(context, {
            id: "builtin-cpu-motherboard-socket",
            code: "builtin.cpu-motherboard.socket",
            sourceSlot: "cpu",
            targetSlot: "motherboard",
            severity: "error",
            messageKey: "cpu_motherboard_socket_mismatch",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-cpu-motherboard-socket",
            ruleCode: "builtin.cpu-motherboard.socket",
            sourceSlot: "cpu",
            targetSlot: "motherboard",
            severity: "error",
            status: cpuSocket === motherboardSocket ? "passed" : "failed",
            messageKey: "cpu_motherboard_socket_mismatch",
            details: {
              sourceValue: cpuSocket,
              targetValue: motherboardSocket,
            },
          },
          context.locale,
        );
      },
    }),
    createRule({
      id: "builtin-motherboard-ram-memory-type",
      code: "builtin.motherboard-ram.memory-type",
      sourceSlot: "motherboard",
      targetSlot: "ram",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.motherboard?.product && context.itemsBySlot.ram?.product);
      },
      evaluate(context) {
        const motherboard = context.itemsBySlot.motherboard?.product ?? null;
        const ram = context.itemsBySlot.ram?.product ?? null;
        const motherboardMemory = getCompatibilityString(motherboard, "motherboard.memory_type");
        const ramMemory = getCompatibilityString(ram, "ram.memory_type");

        if (!motherboardMemory || !ramMemory) {
          return createSkippedCheck(context, {
            id: "builtin-motherboard-ram-memory-type",
            code: "builtin.motherboard-ram.memory-type",
            sourceSlot: "motherboard",
            targetSlot: "ram",
            severity: "error",
            messageKey: "motherboard_ram_memory_type_mismatch",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-motherboard-ram-memory-type",
            ruleCode: "builtin.motherboard-ram.memory-type",
            sourceSlot: "motherboard",
            targetSlot: "ram",
            severity: "error",
            status: motherboardMemory === ramMemory ? "passed" : "failed",
            messageKey: "motherboard_ram_memory_type_mismatch",
            details: {
              sourceValue: motherboardMemory,
              targetValue: ramMemory,
            },
          },
          context.locale,
        );
      },
    }),
    createRule({
      id: "builtin-cooler-socket-support",
      code: "builtin.cooler.socket-support",
      sourceSlot: "cooling",
      targetSlot: "cpu",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.cooling?.product) &&
          Boolean(context.itemsBySlot.cpu?.product || context.itemsBySlot.motherboard?.product);
      },
      evaluate(context) {
        const cooling = context.itemsBySlot.cooling?.product ?? null;
        const cpu = context.itemsBySlot.cpu?.product ?? null;
        const motherboard = context.itemsBySlot.motherboard?.product ?? null;
        const supportedSockets = getCompatibilityList(cooling, "cooler.supported_sockets");
        const requiredSocket =
          getCompatibilityString(cpu, "cpu.socket") ??
          getCompatibilityString(motherboard, "motherboard.socket");

        if (!requiredSocket || supportedSockets.length === 0) {
          return createSkippedCheck(context, {
            id: "builtin-cooler-socket-support",
            code: "builtin.cooler.socket-support",
            sourceSlot: "cooling",
            targetSlot: "cpu",
            severity: "error",
            messageKey: "cooler_socket_unsupported",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-cooler-socket-support",
            ruleCode: "builtin.cooler.socket-support",
            sourceSlot: "cooling",
            targetSlot: "cpu",
            severity: "error",
            status: supportedSockets.includes(requiredSocket) ? "passed" : "failed",
            messageKey: "cooler_socket_unsupported",
            details: {
              sourceValue: supportedSockets,
              targetValue: requiredSocket,
            },
          },
          context.locale,
        );
      },
    }),
    createRule({
      id: "builtin-gpu-case-length",
      code: "builtin.gpu-case.length",
      sourceSlot: "gpu",
      targetSlot: "case",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.gpu?.product && context.itemsBySlot.case?.product);
      },
      evaluate(context) {
        const gpu = context.itemsBySlot.gpu?.product ?? null;
        const pcCase = context.itemsBySlot.case?.product ?? null;
        const gpuLength = getCompatibilityNumber(gpu, "gpu.length_mm");
        const maxGpuLength = getCompatibilityNumber(pcCase, "case.max_gpu_length_mm");

        if (!gpuLength || !maxGpuLength) {
          return createSkippedCheck(context, {
            id: "builtin-gpu-case-length",
            code: "builtin.gpu-case.length",
            sourceSlot: "gpu",
            targetSlot: "case",
            severity: "error",
            messageKey: "gpu_case_length_exceeded",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-gpu-case-length",
            ruleCode: "builtin.gpu-case.length",
            sourceSlot: "gpu",
            targetSlot: "case",
            severity: "error",
            status: gpuLength <= maxGpuLength ? "passed" : "failed",
            messageKey: "gpu_case_length_exceeded",
            details: {
              sourceValue: gpuLength,
              targetValue: maxGpuLength,
            },
          },
          context.locale,
        );
      },
    }),
    createRule({
      id: "builtin-motherboard-case-form-factor",
      code: "builtin.motherboard-case.form-factor",
      sourceSlot: "motherboard",
      targetSlot: "case",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.motherboard?.product && context.itemsBySlot.case?.product);
      },
      evaluate(context) {
        const motherboard = context.itemsBySlot.motherboard?.product ?? null;
        const pcCase = context.itemsBySlot.case?.product ?? null;
        const formFactor = getCompatibilityString(motherboard, "motherboard.form_factor");
        const supportedFormFactors = getCompatibilityList(pcCase, "case.supported_form_factors");

        if (!formFactor || supportedFormFactors.length === 0) {
          return createSkippedCheck(context, {
            id: "builtin-motherboard-case-form-factor",
            code: "builtin.motherboard-case.form-factor",
            sourceSlot: "motherboard",
            targetSlot: "case",
            severity: "error",
            messageKey: "motherboard_case_form_factor_unsupported",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-motherboard-case-form-factor",
            ruleCode: "builtin.motherboard-case.form-factor",
            sourceSlot: "motherboard",
            targetSlot: "case",
            severity: "error",
            status: supportedFormFactors.includes(formFactor) ? "passed" : "failed",
            messageKey: "motherboard_case_form_factor_unsupported",
            details: {
              sourceValue: formFactor,
              targetValue: supportedFormFactors,
            },
          },
          context.locale,
        );
      },
    }),
    createRule({
      id: "builtin-cooler-case-height",
      code: "builtin.cooler-case.height",
      sourceSlot: "cooling",
      targetSlot: "case",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.cooling?.product && context.itemsBySlot.case?.product);
      },
      evaluate(context) {
        const cooling = context.itemsBySlot.cooling?.product ?? null;
        const pcCase = context.itemsBySlot.case?.product ?? null;
        const coolerHeight = getCompatibilityNumber(cooling, "cooler.height_mm");
        const maxCoolerHeight = getCompatibilityNumber(pcCase, "case.max_cooler_height_mm");

        if (!coolerHeight || !maxCoolerHeight) {
          return createSkippedCheck(context, {
            id: "builtin-cooler-case-height",
            code: "builtin.cooler-case.height",
            sourceSlot: "cooling",
            targetSlot: "case",
            severity: "error",
            messageKey: "cooler_case_height_exceeded",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-cooler-case-height",
            ruleCode: "builtin.cooler-case.height",
            sourceSlot: "cooling",
            targetSlot: "case",
            severity: "error",
            status: coolerHeight <= maxCoolerHeight ? "passed" : "failed",
            messageKey: "cooler_case_height_exceeded",
            details: {
              sourceValue: coolerHeight,
              targetValue: maxCoolerHeight,
            },
          },
          context.locale,
        );
      },
    }),
    createRule({
      id: "builtin-psu-sufficiency",
      code: "builtin.psu.sufficiency",
      sourceSlot: "psu",
      targetSlot: "gpu",
      canEvaluate(context) {
        return Boolean(context.itemsBySlot.psu?.product) &&
          Boolean(
            context.itemsBySlot.cpu?.product ||
              context.itemsBySlot.gpu?.product ||
              context.itemsBySlot.motherboard?.product,
          );
      },
      evaluate(context) {
        const cpu = context.itemsBySlot.cpu?.product ?? null;
        const gpu = context.itemsBySlot.gpu?.product ?? null;
        const psu = context.itemsBySlot.psu?.product ?? null;
        const ram = context.itemsBySlot.ram?.product ?? null;
        const storage = context.itemsBySlot.storage?.product ?? null;
        const cooling = context.itemsBySlot.cooling?.product ?? null;

        const psuWattage = getCompatibilityNumber(psu, "psu.wattage");
        const cpuTdp = getCompatibilityNumber(cpu, "cpu.tdp") ?? 0;
        const gpuPower = getCompatibilityNumber(gpu, "gpu.power_draw_w") ?? 0;
        const gpuRecommended = getCompatibilityNumber(gpu, "gpu.recommended_psu_w") ?? 0;
        const ramReserve = ram ? 10 : 0;
        const storageReserve = storage ? 10 : 0;
        const coolingReserve = cooling ? 10 : 0;
        const motherboardReserve = context.itemsBySlot.motherboard?.product ? 60 : 0;
        const systemLoad = cpuTdp + gpuPower + ramReserve + storageReserve + coolingReserve + motherboardReserve;
        const estimatedRequired = roundUpToStep(
          Math.max(gpuRecommended, systemLoad > 0 ? systemLoad * 1.25 : 0),
          50,
        );

        if (!psuWattage || estimatedRequired === 0) {
          return createSkippedCheck(context, {
            id: "builtin-psu-sufficiency",
            code: "builtin.psu.sufficiency",
            sourceSlot: "psu",
            targetSlot: "gpu",
            severity: "warning",
            messageKey: "psu_capacity_warning",
          });
        }

        return finalizeCompatibilityCheck(
          {
            ruleId: "builtin-psu-sufficiency",
            ruleCode: "builtin.psu.sufficiency",
            sourceSlot: "psu",
            targetSlot: "gpu",
            severity: "warning",
            status: psuWattage >= estimatedRequired ? "passed" : "warning",
            messageKey: "psu_capacity_warning",
            details: {
              sourceValue: psuWattage,
              thresholdValue: estimatedRequired,
              computedValue: systemLoad,
            },
          },
          context.locale,
        );
      },
    }),
  ] satisfies CompatibilityRuleEvaluator[];
}
