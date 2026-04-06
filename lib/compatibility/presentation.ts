import type { AppLocale } from "@/lib/constants";
import type { CompatibilityResultStatus } from "@/lib/compatibility/types";

export function getCompatibilityStatusBadgeLabel(
  status: CompatibilityResultStatus,
  _locale: AppLocale,
) {
  if (status === "pass") {
    return "Сумісно";
  }

  if (status === "warning") {
    return "Попередження";
  }

  return "Несумісно";
}

export function getCompatibilityStatusTitle(
  status: CompatibilityResultStatus,
  _locale: AppLocale,
) {
  if (status === "pass") {
    return "Збірка сумісна";
  }

  if (status === "warning") {
    return "Є попередження щодо сумісності";
  }

  return "Є проблеми сумісності";
}

export function getCompatibilityStatusTone(status: CompatibilityResultStatus) {
  if (status === "pass") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
  }

  if (status === "warning") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-600";
  }

  return "border-rose-500/20 bg-rose-500/10 text-rose-600";
}

export function getCompatibilityAdditionalMessagesLabel(
  count: number,
  _locale: AppLocale,
) {
  if (count <= 0) {
    return "";
  }

  return `Ще ${count} повідомл.`;
}
