import type { AppLocale } from "@/lib/constants";
import type { CompatibilityCheck, CompatibilityDetails } from "@/lib/compatibility/types";

type CompatibilityMessageFormatter = (details: CompatibilityDetails, locale: AppLocale) => string;
type CompatibilityMessageCatalog = Record<AppLocale, Record<string, CompatibilityMessageFormatter>>;
type CompatibilityFallbackKind = "candidate_incompatible" | "build_incompatible" | "check_failed";

const localeMap: Record<AppLocale, string> = {
  uk: "uk-UA",
  ru: "ru-RU",
  en: "en-US",
};

const fallbackMessages: Record<AppLocale, Record<CompatibilityFallbackKind, string>> = {
  uk: {
    candidate_incompatible: "Вибраний компонент несумісний з поточною конфігурацією.",
    build_incompatible: "У збірці є несумісні компоненти.",
    check_failed: "Перевірка сумісності не пройдена.",
  },
  ru: {
    candidate_incompatible: "Выбранный компонент несовместим с текущей конфигурацией.",
    build_incompatible: "В сборке есть несовместимые компоненты.",
    check_failed: "Проверка совместимости не пройдена.",
  },
  en: {
    candidate_incompatible: "The selected component is incompatible with the current configuration.",
    build_incompatible: "The build contains incompatible components.",
    check_failed: "Compatibility check failed.",
  },
};

function formatNumber(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(localeMap[locale], {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
  }).format(value);
}

function formatValue(
  value: CompatibilityDetails[keyof CompatibilityDetails],
  locale: AppLocale,
) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "number") {
    return formatNumber(value, locale);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

const compatibilityMessages: CompatibilityMessageCatalog = {
  uk: {
    cpu_motherboard_socket_mismatch: () =>
      "Процесор і материнська плата несумісні: відрізняється сокет.",
    motherboard_ram_memory_type_mismatch: () =>
      "Материнська плата не підтримує вибраний тип пам'яті.",
    cooler_socket_unsupported: () =>
      "Кулер несумісний із сокетом вибраного процесора.",
    gpu_case_length_exceeded: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Відеокарта не поміщається в корпус: потрібно ${source} мм, доступно ${target} мм.`;
    },
    motherboard_case_form_factor_unsupported: () =>
      "Корпус не підтримує форм-фактор вибраної материнської плати.",
    cooler_case_height_exceeded: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Висота кулера перевищує допустиму для корпусу: потрібно ${source} мм, доступно ${target} мм.`;
    },
    psu_capacity_warning: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const threshold = formatValue(details.thresholdValue, locale);
      return `Потужності блока живлення може бути недостатньо: орієнтовно потрібно ${threshold} Вт, вибрано ${source} Вт.`;
    },
    attribute_equals_mismatch: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Параметри не збігаються: ${source} та ${target}.`;
    },
    attribute_list_missing: (details, locale) => {
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Потрібне значення не підтримується: ${target}.`;
    },
    attribute_numeric_lte_failed: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Компонент перевищує допустиме обмеження: ${source} > ${target}.`;
    },
    attribute_numeric_gte_failed: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Параметр компонента нижчий за потрібний поріг: ${source} < ${target}.`;
    },
  },
  ru: {
    cpu_motherboard_socket_mismatch: () =>
      "Процессор и материнская плата несовместимы: отличается сокет.",
    motherboard_ram_memory_type_mismatch: () =>
      "Материнская плата не поддерживает выбранный тип памяти.",
    cooler_socket_unsupported: () =>
      "Кулер несовместим с сокетом выбранного процессора.",
    gpu_case_length_exceeded: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Видеокарта не помещается в корпус: требуется ${source} мм, доступно ${target} мм.`;
    },
    motherboard_case_form_factor_unsupported: () =>
      "Корпус не поддерживает форм-фактор выбранной материнской платы.",
    cooler_case_height_exceeded: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Высота кулера превышает допустимую для корпуса: требуется ${source} мм, доступно ${target} мм.`;
    },
    psu_capacity_warning: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const threshold = formatValue(details.thresholdValue, locale);
      return `Мощности блока питания может не хватить: ориентировочно нужно ${threshold} Вт, выбран ${source} Вт.`;
    },
    attribute_equals_mismatch: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Параметры не совпадают: ${source} и ${target}.`;
    },
    attribute_list_missing: (details, locale) => {
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Требуемое значение не поддерживается: ${target}.`;
    },
    attribute_numeric_lte_failed: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Компонент превышает допустимое ограничение: ${source} > ${target}.`;
    },
    attribute_numeric_gte_failed: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `Параметр компонента ниже требуемого порога: ${source} < ${target}.`;
    },
  },
  en: {
    cpu_motherboard_socket_mismatch: () =>
      "CPU and motherboard are incompatible: the socket does not match.",
    motherboard_ram_memory_type_mismatch: () =>
      "The motherboard does not support the selected memory type.",
    cooler_socket_unsupported: () =>
      "The cooler is incompatible with the selected CPU socket.",
    gpu_case_length_exceeded: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `The graphics card does not fit the case: ${source} mm required, ${target} mm available.`;
    },
    motherboard_case_form_factor_unsupported: () =>
      "The case does not support the selected motherboard form factor.",
    cooler_case_height_exceeded: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `The cooler height exceeds the case limit: ${source} mm required, ${target} mm available.`;
    },
    psu_capacity_warning: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const threshold = formatValue(details.thresholdValue, locale);
      return `The power supply may be insufficient: about ${threshold} W is recommended, while ${source} W is selected.`;
    },
    attribute_equals_mismatch: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `The required attributes do not match: ${source} vs ${target}.`;
    },
    attribute_list_missing: (details, locale) => {
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `The required value is not supported: ${target}.`;
    },
    attribute_numeric_lte_failed: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `The component exceeds the supported limit: ${source} > ${target}.`;
    },
    attribute_numeric_gte_failed: (details, locale) => {
      const source = formatValue(details.sourceValue ?? details.actualValue, locale);
      const target = formatValue(details.targetValue ?? details.requiredValue, locale);
      return `The component is below the required threshold: ${source} < ${target}.`;
    },
  },
};

export function getCompatibilityFallbackMessage(
  kind: CompatibilityFallbackKind,
  locale: AppLocale,
) {
  return fallbackMessages[locale][kind];
}

export function getCompatibilityMessage(
  messageKey: string,
  locale: AppLocale,
  details: CompatibilityDetails,
) {
  const formatter = compatibilityMessages[locale][messageKey];
  return formatter ? formatter(details, locale) : getCompatibilityFallbackMessage("check_failed", locale);
}

export function finalizeCompatibilityCheck(
  check: Omit<CompatibilityCheck, "message">,
  locale: AppLocale,
) {
  return {
    ...check,
    message: getCompatibilityMessage(check.messageKey, locale, check.details),
  };
}
