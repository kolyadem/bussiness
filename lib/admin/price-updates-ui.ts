/**
 * Copy + label mappings for the admin price updates module (Ukrainian only).
 * Raw API enums are not shown to users — use the map* helpers below.
 */

export type PriceUpdatesUiLocale = "uk";

export function priceUpdatesUiLocale(_locale: string): PriceUpdatesUiLocale {
  return "uk";
}

const L = {
  listTitle: "Оновлення цін",
  listIntro:
    "Попередня перевірка тягне ціни та наявність з Rozetka та Telemart за посиланнями в metadata.priceTracking. Після підтвердження рядка оновлюються ціна та (якщо кандидат наявності впевнений) статус наявності в каталозі; кількість на складі не змінюється.",
  sectionRecentRuns: "Останні перевірки",
  sectionRollback: "Відкат останніх змін",
  emptyRuns: "Поки немає жодної перевірки.",
  runLinesLabel: "рядків",
  runAppliedOn: "застосовано",
  rollbackEmpty:
    "Немає активних змін цін для відкату (або все вже відкочено).",
  newPreviewTitle: "Нова перевірка цін",
  newPreviewIntro:
    "Завантажує сторінки Rozetka та Telemart за посиланнями з metadata.priceTracking. У каталозі оновлюються ціна та (за впевненого кандидата) статус наявності; кількість на складі не змінюється.",
  newPreviewWarn:
    "Розпізнавання цін евристичне — відкрийте звіт і звірте базову суму в гривнях з живою карткою на сайті джерела перед застосуванням.",
  labelImportKey: "Ключ джерела імпорту (необов’язково)",
  labelMaxProducts: "Максимум товарів",
  btnRunPreview: "Запустити перевірку",
  btnRunning: "Виконується…",
  toastPreviewFail: "Не вдалося виконати перевірку",
  toastPreviewOk: "Перевірку завершено: {0} рядків",
  toastNetwork: "Помилка мережі",
  placeholderImportKey: "наприклад phase1-mini-batch-v1",
  backToList: "← До списку",
  runTitle: "Перевірка {0}",
  runStatusLabel: "Стан",
  runAppliedAt: "Застосовано",
  warnBeforeApplyTitle: "Перед застосуванням:",
  warnBeforeApplyBody:
    "Перевірте кожен позначений рядок на живій сторінці Rozetka або Telemart (ціна й наявність). Не підтверджуйте рядки з сумнівною моделлю, дивними сумами або відхиленим статусом.",
  btnSaveApprovals: "Зберегти підтвердження",
  btnApply: "Застосувати підтверджені ціни",
  toastSaveFail: "Не вдалося зберегти",
  toastSaveOk: "Підтвердження збережено",
  toastApplyFail: "Не вдалося застосувати",
  toastApplyOk: "Оновлено цін: {0}",
  toastSkippedStale: "Пропущено застарілих рядків: {0} (див. консоль)",
  thApprove: "Підтвердити",
  thArticle: "Артикул (SKU)",
  thName: "Назва",
  thCurrent: "Зараз у каталозі",
  thRozetka: "Rozetka, ₴",
  thTelemart: "Telemart, ₴",
  thBase: "База для розрахунку",
  thNew: "Нова ціна (+3%)",
  thStatus: "Статус перевірки",
  thConfidence: "Впевненість",
  thMatchNote: "Коментар перевірки",
  thAvailRoz: "Rozetka — наявність",
  thAvailTm: "Telemart — наявність",
  thAvailCandidate: "Наявність (кандидат)",
  thAvailExplain: "Як визначено наявність",
  availInStock: "В наявності",
  availOutStock: "Немає",
  availUnknown: "Невідомо",
  checkboxRejectTitle: "Рядок відхилено автоматично — не підтверджуйте",
  colMatchNoteHint: "Деталі для кожного артикула — нижче таблиці.",
  rollbackConfirm: "Повернути попередню ціну для цього товару?",
  rollbackBtn: "Відкатити",
  rollbackBusy: "…",
  rollbackToastFail: "Не вдалося відкатити",
  rollbackToastOk: "Ціну відновлено",
  rollbackThApplied: "Коли застосовано",
  rollbackThWas: "Було",
  rollbackThBecame: "Стало",
  rollbackThAction: "Дія",
  baseSourceRozetka: "Rozetka",
  baseSourceTelemart: "Telemart",
} as const;

type Key = keyof typeof L;

export function priceUpdatesT(_locale: string, key: Key): string {
  return L[key];
}

export function priceUpdatesTFormat(_locale: string, key: Key, ...args: string[]): string {
  let s = priceUpdatesT(_locale, key);
  args.forEach((a, i) => {
    s = s.replace(`{${i}}`, a);
  });
  return s;
}

/** Line matcher outcome — human-readable. */
export function mapLineStatusLabel(_locale: string, raw: string): string {
  switch (raw) {
    case "APPROVED_CANDIDATE":
      return "Можна підтвердити";
    case "MANUAL_REVIEW":
      return "Потрібна перевірка";
    case "REJECTED":
      return "Не збігається з карткою";
    default:
      return raw;
  }
}

export function mapConfidenceLabel(_locale: string, raw: string): string {
  switch (raw) {
    case "NONE":
      return "немає";
    case "LOW":
      return "низька";
    case "MEDIUM":
      return "середня";
    case "HIGH":
      return "висока";
    default:
      return raw;
  }
}

/** Parsed retailer availability — human-readable. */
export function mapRetailAvailabilityLabel(locale: string, raw: string): string {
  switch (raw) {
    case "in_stock":
      return priceUpdatesT(locale, "availInStock");
    case "out_of_stock":
      return priceUpdatesT(locale, "availOutStock");
    case "unknown":
      return priceUpdatesT(locale, "availUnknown");
    default:
      return raw;
  }
}

export function mapRunStatusLabel(_locale: string, raw: string): string {
  switch (raw) {
    case "PREVIEW_READY":
      return "Очікує перевірки";
    case "APPLIED":
      return "Застосовано";
    case "CANCELLED":
      return "Скасовано";
    default:
      return raw;
  }
}

export function mapBaseSourceLabel(_locale: string, raw: string | null | undefined): string {
  if (!raw) return "";
  if (raw === "ROZETKA") return L.baseSourceRozetka;
  if (raw === "TELEMART") return L.baseSourceTelemart;
  return raw;
}

/** Safety notice — Ukrainian copy. */
export function priceUpdatesSafetyCopy(_locale: string): { title: string; body: string[] } {
  return {
    title: "Важливо: ціни знімаються евристично",
    body: [
      "Значення зі сторінок Rozetka та Telemart витягуються автоматично й можуть помилятися на складних сторінках.",
      "Наявність визначається консервативно: при сумніві залишається «невідомо», і каталог тоді не змінює статус наявності.",
      "Перед застосуванням підтверджених цін обов’язково звірте суму в гривнях з актуальною карткою товару на сайті джерела.",
      "Не підтверджуйте рядки з низькою впевненістю, підозрілими числами або якщо товар не збігається з вашим артикулом.",
    ],
  };
}
