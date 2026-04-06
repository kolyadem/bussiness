import type { AppLocale } from "@/lib/constants";

export const IMPORT_SOURCE_TYPES = ["API_JSON", "FEED_URL", "UPLOAD_JSON", "UPLOAD_CSV", "UPLOAD_XML"] as const;

export type ImportSourceType = (typeof IMPORT_SOURCE_TYPES)[number];

export const IMPORT_MODES = [
  "CREATE_ONLY",
  "UPDATE_EXISTING",
  "UPSERT",
  "DISABLE_MISSING",
  "MARK_MISSING_AS_DRAFT",
] as const;

export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_JOB_STATUSES = [
  "QUEUED",
  "RUNNING",
  "SUCCESS",
  "PARTIAL_SUCCESS",
  "FAILED",
] as const;

export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export const IMPORT_JOB_TRIGGERS = ["MANUAL", "RERUN", "SCHEDULED"] as const;

export type ImportJobTrigger = (typeof IMPORT_JOB_TRIGGERS)[number];

export const IMPORT_ISSUE_SEVERITIES = ["WARNING", "ERROR"] as const;

export type ImportIssueSeverity = (typeof IMPORT_ISSUE_SEVERITIES)[number];

export const IMPORT_AUTH_TYPES = ["NONE", "BEARER", "CUSTOM_HEADERS"] as const;

export type ImportAuthType = (typeof IMPORT_AUTH_TYPES)[number];

export function isImportMode(value: string): value is ImportMode {
  return IMPORT_MODES.includes(value as ImportMode);
}

export function isImportJobStatus(value: string): value is ImportJobStatus {
  return IMPORT_JOB_STATUSES.includes(value as ImportJobStatus);
}

export function isImportJobTrigger(value: string): value is ImportJobTrigger {
  return IMPORT_JOB_TRIGGERS.includes(value as ImportJobTrigger);
}

export function isImportIssueSeverity(value: string): value is ImportIssueSeverity {
  return IMPORT_ISSUE_SEVERITIES.includes(value as ImportIssueSeverity);
}

export function isImportSourceType(value: string): value is ImportSourceType {
  return IMPORT_SOURCE_TYPES.includes(value as ImportSourceType);
}

function importText(
  _locale: AppLocale,
  copy: {
    uk: string;
  },
) {
  return copy.uk;
}

export function getImportModeLabel(mode: ImportMode, locale: AppLocale) {
  switch (mode) {
    case "CREATE_ONLY":
      return importText(locale, {
        uk: "Лише створення",
      });
    case "UPDATE_EXISTING":
      return importText(locale, {
        uk: "Лише оновлення",
      });
    case "UPSERT":
      return importText(locale, {
        uk: "Створити або оновити",
      });
    case "DISABLE_MISSING":
      return importText(locale, {
        uk: "Вимкнути відсутні",
      });
    case "MARK_MISSING_AS_DRAFT":
      return importText(locale, {
        uk: "Відсутні у чернетку",
      });
  }
}

export function getImportSourceTypeLabel(
  sourceType: ImportSourceType,
  locale: AppLocale,
) {
  switch (sourceType) {
    case "API_JSON":
      return "JSON API";
    case "FEED_URL":
      return importText(locale, {
        uk: "Feed URL",
      });
    case "UPLOAD_JSON":
      return "JSON file";
    case "UPLOAD_CSV":
      return "CSV file";
    case "UPLOAD_XML":
      return "XML/YML file";
  }
}

export function getImportJobStatusLabel(
  status: ImportJobStatus,
  locale: AppLocale,
) {
  switch (status) {
    case "QUEUED":
      return importText(locale, {
        uk: "У черзі",
      });
    case "RUNNING":
      return importText(locale, {
        uk: "Виконується",
      });
    case "SUCCESS":
      return importText(locale, {
        uk: "Успішно",
      });
    case "PARTIAL_SUCCESS":
      return importText(locale, {
        uk: "Частково успішно",
      });
    case "FAILED":
      return importText(locale, {
        uk: "Помилка",
      });
  }
}

export function getImportJobStatusTone(status: ImportJobStatus) {
  switch (status) {
    case "SUCCESS":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "PARTIAL_SUCCESS":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-100";
    case "FAILED":
      return "border border-rose-500/20 bg-rose-500/10 text-rose-100";
    case "RUNNING":
      return "border border-sky-500/20 bg-sky-500/10 text-sky-100";
    case "QUEUED":
      return "border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]";
  }
}

export function getImportIssueSeverityLabel(
  severity: ImportIssueSeverity,
  locale: AppLocale,
) {
  return severity === "ERROR"
    ? importText(locale, {
        uk: "Помилка",
      })
    : importText(locale, {
        uk: "Попередження",
      });
}

export function getImportIssueSeverityTone(severity: ImportIssueSeverity) {
  return severity === "ERROR"
    ? "border border-rose-500/20 bg-rose-500/10 text-rose-100"
    : "border border-amber-500/20 bg-amber-500/10 text-amber-100";
}
