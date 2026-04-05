/**
 * Copy + label mappings for the admin price updates module (uk / ru / en fallback).
 * Raw API enums are not shown to users — use the map* helpers below.
 */

export type PriceUpdatesUiLocale = "uk" | "ru" | "en";

export function priceUpdatesUiLocale(locale: string): PriceUpdatesUiLocale {
  if (locale === "uk" || locale === "ru") return locale;
  return "en";
}

const L = {
  uk: {
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
  },
  ru: {
    listTitle: "Обновление цен",
    listIntro:
      "Предварительная проверка подтягивает цены и наличие с Rozetka и Telemart по ссылкам в metadata.priceTracking. После подтверждения строки обновляются цена и (если кандидат наличия уверен) статус наличия в каталоге; количество на складе не меняется.",
    sectionRecentRuns: "Последние проверки",
    sectionRollback: "Откат последних изменений",
    emptyRuns: "Пока нет ни одной проверки.",
    runLinesLabel: "строк",
    runAppliedOn: "применено",
    rollbackEmpty:
      "Нет активных изменений цен для отката (или всё уже откатено).",
    newPreviewTitle: "Новая проверка цен",
    newPreviewIntro:
      "Загружает страницы Rozetka и Telemart по ссылкам из metadata.priceTracking. В каталоге обновляются цена и (при уверенном кандидате) статус наличия; количество на складе не меняется.",
    newPreviewWarn:
      "Распознавание цен эвристическое — откройте отчёт и сверьте базовую сумму в гривнах с живой карточкой на сайте источника перед применением.",
    labelImportKey: "Ключ источника импорта (необязательно)",
    labelMaxProducts: "Максимум товаров",
    btnRunPreview: "Запустить проверку",
    btnRunning: "Выполняется…",
    toastPreviewFail: "Не удалось выполнить проверку",
    toastPreviewOk: "Проверка готова: {0} строк",
    toastNetwork: "Ошибка сети",
    placeholderImportKey: "например phase1-mini-batch-v1",
    backToList: "← К списку",
    runTitle: "Проверка {0}",
    runStatusLabel: "Состояние",
    runAppliedAt: "Применено",
    warnBeforeApplyTitle: "Перед применением:",
    warnBeforeApplyBody:
      "Сверьте каждую отмеченную строку с живой страницей Rozetka или Telemart (цена и наличие). Не подтверждайте строки с сомнительной моделью, странными суммами или отклонённым статусом.",
    btnSaveApprovals: "Сохранить подтверждения",
    btnApply: "Применить подтверждённые цены",
    toastSaveFail: "Не удалось сохранить",
    toastSaveOk: "Подтверждения сохранены",
    toastApplyFail: "Не удалось применить",
    toastApplyOk: "Обновлено цен: {0}",
    toastSkippedStale: "Пропущено устаревших строк: {0} (см. консоль)",
    thApprove: "Подтвердить",
    thArticle: "Артикул (SKU)",
    thName: "Название",
    thCurrent: "Сейчас в каталоге",
    thRozetka: "Rozetka, ₴",
    thTelemart: "Telemart, ₴",
    thBase: "База для расчёта",
    thNew: "Новая цена (+3%)",
    thStatus: "Статус проверки",
    thConfidence: "Уверенность",
    thMatchNote: "Комментарий проверки",
    thAvailRoz: "Rozetka — наличие",
    thAvailTm: "Telemart — наличие",
    thAvailCandidate: "Наличие (кандидат)",
    thAvailExplain: "Как определено наличие",
    availInStock: "В наличии",
    availOutStock: "Нет",
    availUnknown: "Неизвестно",
    checkboxRejectTitle: "Строка отклонена автоматически — не подтверждайте",
    colMatchNoteHint: "Детали по каждому артикулу — ниже таблицы.",
    rollbackConfirm: "Вернуть предыдущую цену для этого товара?",
    rollbackBtn: "Откатить",
    rollbackBusy: "…",
    rollbackToastFail: "Не удалось откатить",
    rollbackToastOk: "Цена восстановлена",
    rollbackThApplied: "Когда применено",
    rollbackThWas: "Было",
    rollbackThBecame: "Стало",
    rollbackThAction: "Действие",
    baseSourceRozetka: "Rozetka",
    baseSourceTelemart: "Telemart",
  },
  en: {
    listTitle: "Price updates",
    listIntro:
      "Preview pulls prices and availability from Rozetka/Telemart via metadata.priceTracking. After you confirm a row, Product.price updates and inventory status may update when the availability candidate is confident; stock quantity is not changed.",
    sectionRecentRuns: "Recent preview runs",
    sectionRollback: "Rollback recent changes",
    emptyRuns: "No preview runs yet.",
    runLinesLabel: "lines",
    runAppliedOn: "applied",
    rollbackEmpty: "No active price changes to roll back (or all already rolled back).",
    newPreviewTitle: "New price preview",
    newPreviewIntro:
      "Fetches retailer pages using metadata.priceTracking URLs. Product.price and inventory status (when candidate is confident) update on apply; stock quantity is unchanged.",
    newPreviewWarn:
      "Price parsing is heuristic — open the run and verify base ₴ on the live retailer page before applying.",
    labelImportKey: "Import source key (optional)",
    labelMaxProducts: "Max products",
    btnRunPreview: "Run preview",
    btnRunning: "Running…",
    toastPreviewFail: "Preview failed",
    toastPreviewOk: "Preview ready: {0} lines",
    toastNetwork: "Network error",
    placeholderImportKey: "e.g. phase1-mini-batch-v1",
    backToList: "← Back to list",
    runTitle: "Run {0}",
    runStatusLabel: "Status",
    runAppliedAt: "Applied",
    warnBeforeApplyTitle: "Before apply:",
    warnBeforeApplyBody:
      "Confirm each approved row against the live Rozetka/Telemart page (price and availability). Do not approve doubtful rows (wrong model, odd amounts, or rejected status).",
    btnSaveApprovals: "Save approvals",
    btnApply: "Apply approved prices",
    toastSaveFail: "Save failed",
    toastSaveOk: "Approvals saved",
    toastApplyFail: "Apply failed",
    toastApplyOk: "Updated prices: {0}",
    toastSkippedStale: "Skipped stale rows: {0} (see console)",
    thApprove: "Confirm",
    thArticle: "SKU",
    thName: "Name",
    thCurrent: "Current catalog",
    thRozetka: "Rozetka, ₴",
    thTelemart: "Telemart, ₴",
    thBase: "Base for calculation",
    thNew: "New price (+3%)",
    thStatus: "Review status",
    thConfidence: "Confidence",
    thMatchNote: "Match note",
    thAvailRoz: "Rozetka — availability",
    thAvailTm: "Telemart — availability",
    thAvailCandidate: "Availability (candidate)",
    thAvailExplain: "How availability was determined",
    availInStock: "In stock",
    availOutStock: "Out of stock",
    availUnknown: "Unknown",
    checkboxRejectTitle: "Row rejected by matcher — do not approve",
    colMatchNoteHint: "Per-article details below the table.",
    rollbackConfirm: "Restore previous price for this product?",
    rollbackBtn: "Rollback",
    rollbackBusy: "…",
    rollbackToastFail: "Rollback failed",
    rollbackToastOk: "Price restored",
    rollbackThApplied: "Applied at",
    rollbackThWas: "Was",
    rollbackThBecame: "Became",
    rollbackThAction: "Action",
    baseSourceRozetka: "Rozetka",
    baseSourceTelemart: "Telemart",
  },
} as const;

type Key = keyof typeof L.uk;

export function priceUpdatesT(locale: string, key: Key): string {
  const loc = priceUpdatesUiLocale(locale);
  return L[loc][key] ?? L.en[key];
}

export function priceUpdatesTFormat(locale: string, key: Key, ...args: string[]): string {
  let s = priceUpdatesT(locale, key);
  args.forEach((a, i) => {
    s = s.replace(`{${i}}`, a);
  });
  return s;
}

/** Line matcher outcome — human-readable. */
export function mapLineStatusLabel(locale: string, raw: string): string {
  const loc = priceUpdatesUiLocale(locale);
  switch (raw) {
    case "APPROVED_CANDIDATE":
      return loc === "uk" ? "Можна підтвердити" : loc === "ru" ? "Можно подтвердить" : "Ready to confirm";
    case "MANUAL_REVIEW":
      return loc === "uk" ? "Потрібна перевірка" : loc === "ru" ? "Нужна проверка" : "Needs review";
    case "REJECTED":
      return loc === "uk" ? "Не збігається з карткою" : loc === "ru" ? "Не совпадает с карточкой" : "No match";
    default:
      return raw;
  }
}

export function mapConfidenceLabel(locale: string, raw: string): string {
  const loc = priceUpdatesUiLocale(locale);
  switch (raw) {
    case "NONE":
      return loc === "uk" ? "немає" : loc === "ru" ? "нет" : "none";
    case "LOW":
      return loc === "uk" ? "низька" : loc === "ru" ? "низкая" : "low";
    case "MEDIUM":
      return loc === "uk" ? "середня" : loc === "ru" ? "средняя" : "medium";
    case "HIGH":
      return loc === "uk" ? "висока" : loc === "ru" ? "высокая" : "high";
    default:
      return raw;
  }
}

/** Parsed retailer availability — human-readable (uk / ru / en). */
export function mapRetailAvailabilityLabel(locale: string, raw: string): string {
  const loc = priceUpdatesUiLocale(locale);
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

export function mapRunStatusLabel(locale: string, raw: string): string {
  const loc = priceUpdatesUiLocale(locale);
  switch (raw) {
    case "PREVIEW_READY":
      return loc === "uk" ? "Очікує перевірки" : loc === "ru" ? "Ожидает проверки" : "Awaiting review";
    case "APPLIED":
      return loc === "uk" ? "Застосовано" : loc === "ru" ? "Применено" : "Applied";
    case "CANCELLED":
      return loc === "uk" ? "Скасовано" : loc === "ru" ? "Отменено" : "Cancelled";
    default:
      return raw;
  }
}

export function mapBaseSourceLabel(locale: string, raw: string | null | undefined): string {
  if (!raw) return "";
  const loc = priceUpdatesUiLocale(locale);
  if (raw === "ROZETKA") return loc === "en" ? "Rozetka" : priceUpdatesT(locale, "baseSourceRozetka");
  if (raw === "TELEMART") return loc === "en" ? "Telemart" : priceUpdatesT(locale, "baseSourceTelemart");
  return raw;
}

/** Safety notice — localized strings (replaces mixed inline copy). */
export function priceUpdatesSafetyCopy(locale: string): { title: string; body: string[] } {
  const loc = priceUpdatesUiLocale(locale);
  if (loc === "uk") {
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
  if (loc === "ru") {
    return {
      title: "Важно: цены снимаются эвристически",
      body: [
        "Значения со страниц Rozetka и Telemart извлекаются автоматически и могут ошибаться на сложных страницах.",
        "Наличие определяется консервативно: при сомнении остаётся «неизвестно», и каталог тогда не меняет статус наличия.",
        "Перед применением подтверждённых цен обязательно сверьте сумму в гривнах с актуальной карточкой на сайте источника.",
        "Не подтверждайте строки с низкой уверенностью, подозрительными числами или если товар не совпадает с вашим артикулом.",
      ],
    };
  }
  return {
    title: "Important: heuristic price extraction",
    body: [
      "Prices are parsed from retailer HTML and may be wrong on complex pages.",
      "Availability is conservative: when uncertain it stays unknown and the catalog will not change inventory status.",
      "Before applying, verify the base amount against the live product page.",
      "Do not approve when confidence is low, numbers look wrong, or the SKU does not match.",
    ],
  };
}
