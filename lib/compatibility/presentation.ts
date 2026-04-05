import type { AppLocale } from "@/lib/constants";
import type { CompatibilityResultStatus } from "@/lib/compatibility/types";

export function getCompatibilityStatusBadgeLabel(
  status: CompatibilityResultStatus,
  locale: AppLocale,
) {
  if (status === "pass") {
    return locale === "uk" ? "Сумісно" : locale === "ru" ? "Совместимо" : "Compatible";
  }

  if (status === "warning") {
    return locale === "uk" ? "Попередження" : locale === "ru" ? "Предупреждение" : "Warning";
  }

  return locale === "uk" ? "Несумісно" : locale === "ru" ? "Несовместимо" : "Incompatible";
}

export function getCompatibilityStatusTitle(
  status: CompatibilityResultStatus,
  locale: AppLocale,
) {
  if (status === "pass") {
    return locale === "uk"
      ? "Збірка сумісна"
      : locale === "ru"
        ? "Сборка совместима"
        : "Build is compatible";
  }

  if (status === "warning") {
    return locale === "uk"
      ? "Є попередження щодо сумісності"
      : locale === "ru"
        ? "Есть предупреждения по совместимости"
        : "Build has compatibility warnings";
  }

  return locale === "uk"
    ? "Є проблеми сумісності"
    : locale === "ru"
      ? "Есть проблемы совместимости"
      : "Build has compatibility issues";
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
  locale: AppLocale,
) {
  if (count <= 0) {
    return "";
  }

  if (locale === "uk") {
    return `Ще ${count} повідомл.`;
  }

  if (locale === "ru") {
    return `Еще ${count} сообщ.`;
  }

  return `${count} more`;
}
