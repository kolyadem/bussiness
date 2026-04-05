"use client";

import { startTransition, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Play, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  IMPORT_MODES,
  IMPORT_SOURCE_TYPES,
  getImportIssueSeverityLabel,
  getImportIssueSeverityTone,
  getImportModeLabel,
  getImportSourceTypeLabel,
  type ImportMode,
  type ImportSourceType,
} from "@/lib/admin/imports/types";

type SourceConfigSummary = {
  id: string;
  key: string;
  name: string;
  sourceType: string;
  endpointUrl: string | null;
  timeoutMs: number;
  retryCount: number;
  maxRows: number;
  maxPayloadBytes: number;
  defaultImportMode: string;
  skuFallbackEnabled: boolean;
  slugFallbackEnabled: boolean;
  isActive: boolean;
  frequency: string | null;
  nextSyncAt: Date | null;
  lastSyncAt: Date | null;
  updatedAt: Date;
};

type PreviewIssue = {
  rowIndex?: number | null;
  severity: "WARNING" | "ERROR";
  code: string;
  message: string;
  rawIdentifier?: string | null;
};

type PreviewResult = {
  jobId?: string;
  ok: boolean;
  error?: string;
  preview?: {
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    warnings: PreviewIssue[];
    errors: PreviewIssue[];
  };
};

function formatBytes(bytes: number, locale: "uk" | "ru" | "en") {
  if (bytes >= 1_048_576) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    }).format(bytes / 1_048_576) + " MB";
  }

  if (bytes >= 1024) {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    }).format(bytes / 1024) + " KB";
  }

  return `${bytes} B`;
}

function formatStableDateTime(value: Date | string, locale: "uk" | "ru" | "en") {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ImportCenter({
  locale,
  sourceConfigs,
}: {
  locale: "uk" | "ru" | "en";
  sourceConfigs: SourceConfigSummary[];
}) {
  const [pending, setPending] = useState(false);
  const [selectedSourceConfigId, setSelectedSourceConfigId] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<ImportSourceType>("API_JSON");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("UPSERT");
  const [timeoutMs, setTimeoutMs] = useState("15000");
  const [retryCount, setRetryCount] = useState("1");
  const [maxRows, setMaxRows] = useState("500");
  const [maxPayloadBytes, setMaxPayloadBytes] = useState("5242880");
  const [authType, setAuthType] = useState("NONE");
  const [authToken, setAuthToken] = useState("");
  const [authHeaders, setAuthHeaders] = useState("{}");
  const [skuFallbackEnabled, setSkuFallbackEnabled] = useState(false);
  const [slugFallbackEnabled, setSlugFallbackEnabled] = useState(false);
  const [saveSourceConfig, setSaveSourceConfig] = useState(false);
  const [frequency, setFrequency] = useState("");
  const [nextSyncAt, setNextSyncAt] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);

  const selectedSourceConfig =
    sourceConfigs.find((config) => config.id === selectedSourceConfigId) ?? null;

  function applySourceConfig(config: SourceConfigSummary | null) {
    if (!config) {
      return;
    }

    setSourceKey(config.key);
    setSourceName(config.name);
    setSourceType(config.sourceType as ImportSourceType);
    setSourceUrl(config.endpointUrl ?? "");
    setImportMode((IMPORT_MODES.includes(config.defaultImportMode as ImportMode)
      ? config.defaultImportMode
      : "UPSERT") as ImportMode);
    setTimeoutMs(String(config.timeoutMs));
    setRetryCount(String(config.retryCount));
    setMaxRows(String(config.maxRows));
    setMaxPayloadBytes(String(config.maxPayloadBytes));
    setSkuFallbackEnabled(config.skuFallbackEnabled);
    setSlugFallbackEnabled(config.slugFallbackEnabled);
    setFrequency(config.frequency ?? "");
    setNextSyncAt(
      config.nextSyncAt
        ? new Date(config.nextSyncAt).toISOString().slice(0, 16)
        : "",
    );
    setSaveSourceConfig(true);
  }

  function buildFormData(dryRun: boolean) {
    const formData = new FormData();

    if (selectedSourceConfigId) {
      formData.set("sourceConfigId", selectedSourceConfigId);
    }

    formData.set("sourceKey", sourceKey);
    formData.set("sourceName", sourceName);
    formData.set("sourceType", sourceType);
    formData.set("sourceUrl", sourceUrl);
    formData.set("importMode", importMode);
    formData.set("dryRun", String(dryRun));
    formData.set("timeoutMs", timeoutMs);
    formData.set("retryCount", retryCount);
    formData.set("maxRows", maxRows);
    formData.set("maxPayloadBytes", maxPayloadBytes);
    formData.set("authType", authType);
    formData.set("authToken", authToken);
    formData.set("authHeaders", authHeaders);
    formData.set("skuFallbackEnabled", String(skuFallbackEnabled));
    formData.set("slugFallbackEnabled", String(slugFallbackEnabled));
    formData.set("saveSourceConfig", String(saveSourceConfig));
    formData.set("frequency", frequency);
    formData.set("nextSyncAt", nextSyncAt);

    if (sourceFile) {
      formData.set("sourceFile", sourceFile);
    }

    return formData;
  }

  function submitImport(dryRun: boolean) {
    setPending(true);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/imports", {
          method: "POST",
          body: buildFormData(dryRun),
        });
        const result = (await response.json().catch(() => null)) as PreviewResult | null;

        if (!response.ok || !result) {
          throw new Error(result?.error || "Import request failed");
        }

        setPreview(result);

        if (dryRun) {
          toast.success(
            locale === "uk"
              ? "Preview готовий"
              : locale === "ru"
                ? "Preview готов"
                : "Preview is ready",
          );
          return;
        }

        toast.success(
          locale === "uk"
            ? "Імпорт завершено"
            : locale === "ru"
              ? "Импорт завершён"
              : "Import finished",
        );

        if (result.jobId) {
          window.location.assign(`/${locale}/admin/imports/${result.jobId}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import request failed";
        toast.error(message);
      } finally {
        setPending(false);
      }
    });
  }

  const copy = {
    launchTitle:
      locale === "uk"
        ? "Новий імпорт товарів"
        : locale === "ru"
          ? "Новый импорт товаров"
          : "New product import",
    launchText:
      locale === "uk"
        ? "Перевірте джерело, режим синхронізації та спочатку запустіть безпечний dry-run preview."
        : locale === "ru"
          ? "Проверьте источник, режим синхронизации и сначала запустите безопасный dry-run preview."
          : "Review the source, sync mode, and start with a safe dry-run preview.",
    sourcePreset:
      locale === "uk" ? "Збережене джерело" : locale === "ru" ? "Сохранённый источник" : "Saved source",
    customSource:
      locale === "uk" ? "Нове джерело" : locale === "ru" ? "Новый источник" : "New source",
    sourceKey: locale === "uk" ? "Ключ джерела" : locale === "ru" ? "Ключ источника" : "Source key",
    sourceName: locale === "uk" ? "Назва джерела" : locale === "ru" ? "Название источника" : "Source name",
    sourceType: locale === "uk" ? "Тип джерела" : locale === "ru" ? "Тип источника" : "Source type",
    sourceUrl: locale === "uk" ? "API / feed URL" : locale === "ru" ? "API / feed URL" : "API / feed URL",
    sourceFile:
      locale === "uk" ? "Файл імпорту" : locale === "ru" ? "Файл импорта" : "Import file",
    importMode: locale === "uk" ? "Режим імпорту" : locale === "ru" ? "Режим импорта" : "Import mode",
    authType: locale === "uk" ? "Авторизація" : locale === "ru" ? "Авторизация" : "Authorization",
    authToken: locale === "uk" ? "API токен" : locale === "ru" ? "API токен" : "API token",
    authHeaders:
      locale === "uk"
        ? "Додаткові headers (JSON)"
        : locale === "ru"
          ? "Дополнительные headers (JSON)"
          : "Additional headers (JSON)",
    limits:
      locale === "uk" ? "Ліміти та надійність" : locale === "ru" ? "Лимиты и надёжность" : "Limits and reliability",
    timeout: locale === "uk" ? "Timeout, мс" : locale === "ru" ? "Timeout, мс" : "Timeout, ms",
    retries: locale === "uk" ? "Retry" : locale === "ru" ? "Retry" : "Retry count",
    maxRows: locale === "uk" ? "Макс. рядків" : locale === "ru" ? "Макс. строк" : "Max rows",
    maxPayload:
      locale === "uk" ? "Макс. payload" : locale === "ru" ? "Макс. payload" : "Max payload",
    matching:
      locale === "uk"
        ? "Правила зіставлення"
        : locale === "ru"
          ? "Правила сопоставления"
          : "Matching rules",
    skuFallback:
      locale === "uk"
        ? "Дозволити SKU fallback"
        : locale === "ru"
          ? "Разрешить SKU fallback"
          : "Allow SKU fallback",
    slugFallback:
      locale === "uk"
        ? "Дозволити slug fallback"
        : locale === "ru"
          ? "Разрешить slug fallback"
          : "Allow slug fallback",
    schedule:
      locale === "uk"
        ? "Foundation для sync"
        : locale === "ru"
          ? "Foundation для sync"
          : "Sync foundation",
    frequency:
      locale === "uk" ? "Частота" : locale === "ru" ? "Частота" : "Frequency",
    nextSync:
      locale === "uk" ? "Наступний sync" : locale === "ru" ? "Следующий sync" : "Next sync",
    saveSource:
      locale === "uk"
        ? "Зберегти як reusable source config"
        : locale === "ru"
          ? "Сохранить как reusable source config"
          : "Save as reusable source config",
    preview:
      locale === "uk" ? "Validate & preview" : locale === "ru" ? "Validate и preview" : "Validate & preview",
    run:
      locale === "uk" ? "Run import" : locale === "ru" ? "Run import" : "Run import",
    safeNote:
      locale === "uk"
        ? "Dry-run не записує Product, зв’язані сутності чи зображення."
        : locale === "ru"
          ? "Dry-run не записывает Product, связанные сущности или изображения."
          : "Dry-run does not write Product data, related entities, or images.",
    previewTitle:
      locale === "uk" ? "Preview результат" : locale === "ru" ? "Результат preview" : "Preview result",
    created: locale === "uk" ? "Створиться" : locale === "ru" ? "Создастся" : "Created",
    updated: locale === "uk" ? "Оновиться" : locale === "ru" ? "Обновится" : "Updated",
    skipped: locale === "uk" ? "Пропуститься" : locale === "ru" ? "Пропустится" : "Skipped",
    failed: locale === "uk" ? "З помилкою" : locale === "ru" ? "С ошибкой" : "Failed",
    totalRows: locale === "uk" ? "Рядків" : locale === "ru" ? "Строк" : "Rows",
    openJob:
      locale === "uk" ? "Відкрити job" : locale === "ru" ? "Открыть job" : "Open job",
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {copy.launchTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">
            {copy.launchText}
          </p>
        </div>
        <div className="rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5">
          <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.safeNote}</p>
          <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-text-soft)]">
            <p>externalId match: `importSourceKey + externalId`</p>
            <p>SKU fallback: {skuFallbackEnabled ? "enabled" : "disabled"}</p>
            <p>Slug fallback: {slugFallbackEnabled ? "enabled" : "disabled"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
        <article className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.sourcePreset}</label>
              <select
                value={selectedSourceConfigId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setSelectedSourceConfigId(nextId);
                  applySourceConfig(sourceConfigs.find((item) => item.id === nextId) ?? null);
                }}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
              >
                <option value="">{copy.customSource}</option>
                {sourceConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.key})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.sourceKey}</label>
                <input
                  value={sourceKey}
                  onChange={(event) => setSourceKey(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  placeholder="supplier-main"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.sourceName}</label>
                <input
                  value={sourceName}
                  onChange={(event) => setSourceName(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  placeholder="Primary supplier feed"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.sourceType}</label>
                <select
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value as ImportSourceType)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                >
                  {IMPORT_SOURCE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {getImportSourceTypeLabel(option, locale)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.importMode}</label>
                <select
                  value={importMode}
                  onChange={(event) => setImportMode(event.target.value as ImportMode)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                >
                  {IMPORT_MODES.map((option) => (
                    <option key={option} value={option}>
                      {getImportModeLabel(option, locale)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {sourceType.startsWith("UPLOAD_") ? (
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.sourceFile}</label>
                <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.4rem] border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-6 text-center transition hover:border-[color:var(--color-accent-line)]">
                  <UploadCloud className="h-5 w-5 text-[color:var(--color-accent-strong)]" />
                  <span className="text-sm text-[color:var(--color-text-soft)]">
                    {sourceFile ? sourceFile.name : "JSON, CSV, XML or YML"}
                  </span>
                  <input
                    type="file"
                    accept=".json,.csv,.xml,.yml,.yaml,text/csv,application/json,text/xml,application/xml"
                    className="hidden"
                    onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.sourceUrl}</label>
                <input
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  placeholder="https://supplier.example.com/feed.json"
                />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.authType}</label>
                <select
                  value={authType}
                  onChange={(event) => setAuthType(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                >
                  <option value="NONE">None</option>
                  <option value="BEARER">Bearer token</option>
                  <option value="CUSTOM_HEADERS">Custom headers</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.authToken}</label>
                <input
                  value={authToken}
                  onChange={(event) => setAuthToken(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  placeholder="Optional bearer token"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.authHeaders}</label>
              <textarea
                value={authHeaders}
                onChange={(event) => setAuthHeaders(event.target.value)}
                className="min-h-[100px] rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
              />
            </div>

            <div className="grid gap-4 rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5 md:grid-cols-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.timeout}</label>
                <input value={timeoutMs} onChange={(event) => setTimeoutMs(event.target.value)} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.retries}</label>
                <input value={retryCount} onChange={(event) => setRetryCount(event.target.value)} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.maxRows}</label>
                <input value={maxRows} onChange={(event) => setMaxRows(event.target.value)} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.maxPayload}</label>
                <input value={maxPayloadBytes} onChange={(event) => setMaxPayloadBytes(event.target.value)} className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)]">
                <input type="checkbox" checked={skuFallbackEnabled} onChange={(event) => setSkuFallbackEnabled(event.target.checked)} />
                <span>{copy.skuFallback}</span>
              </label>
              <label className="flex items-center gap-3 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)]">
                <input type="checkbox" checked={slugFallbackEnabled} onChange={(event) => setSlugFallbackEnabled(event.target.checked)} />
                <span>{copy.slugFallback}</span>
              </label>
              <label className="flex items-center gap-3 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)] md:col-span-2">
                <input type="checkbox" checked={saveSourceConfig} onChange={(event) => setSaveSourceConfig(event.target.checked)} />
                <span>{copy.saveSource}</span>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.frequency}</label>
                <input
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  placeholder="daily / weekly / manual"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.nextSync}</label>
                <input
                  type="datetime-local"
                  value={nextSyncAt}
                  onChange={(event) => setNextSyncAt(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => submitImport(true)}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{copy.preview}</span>
              </Button>
              <Button type="button" disabled={pending} onClick={() => submitImport(false)}>
                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>{copy.run}</span>
              </Button>
            </div>
          </div>
        </article>

        <aside className="space-y-6">
          {selectedSourceConfig ? (
            <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
              <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{selectedSourceConfig.name}</h3>
              <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-text-soft)]">
                <p>{selectedSourceConfig.endpointUrl ?? "Upload source"}</p>
                <p>{getImportSourceTypeLabel(selectedSourceConfig.sourceType as ImportSourceType, locale)}</p>
                <p>
                  {formatBytes(selectedSourceConfig.maxPayloadBytes, locale)} / {selectedSourceConfig.maxRows} rows
                </p>
                <p>
                  {selectedSourceConfig.lastSyncAt
                    ? `${locale === "uk" ? "Останній sync" : locale === "ru" ? "Последний sync" : "Last sync"}: ${formatStableDateTime(selectedSourceConfig.lastSyncAt, locale)}`
                    : locale === "uk"
                      ? "Ще не синхронізувалось"
                      : locale === "ru"
                        ? "Ещё не синхронизировалось"
                        : "No sync yet"}
                </p>
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.previewTitle}</h3>
            {preview?.preview ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: copy.totalRows, value: preview.preview.totalRows },
                    { label: copy.created, value: preview.preview.createdCount },
                    { label: copy.updated, value: preview.preview.updatedCount },
                    { label: copy.skipped, value: preview.preview.skippedCount },
                    { label: copy.failed, value: preview.preview.failedCount },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {[...preview.preview.errors, ...preview.preview.warnings].slice(0, 8).map((issue, index) => (
                    <div key={`${issue.code}-${issue.rowIndex ?? index}`} className={`rounded-[1.2rem] px-4 py-3 text-sm ${getImportIssueSeverityTone(issue.severity)}`}>
                      <div className="flex items-center gap-2">
                        {issue.severity === "ERROR" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span className="font-medium">{getImportIssueSeverityLabel(issue.severity, locale)}</span>
                        {issue.rowIndex ? <span className="text-xs opacity-80">#{issue.rowIndex}</span> : null}
                      </div>
                      <p className="mt-2 leading-6">{issue.message}</p>
                      {issue.rawIdentifier ? <p className="mt-1 text-xs opacity-80">{issue.rawIdentifier}</p> : null}
                    </div>
                  ))}
                </div>

                {preview.jobId ? (
                  <a
                    href={`/${locale}/admin/imports/${preview.jobId}`}
                    className="inline-flex text-sm font-medium text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                  >
                    {copy.openJob}
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.4rem] border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-8 text-sm leading-7 text-[color:var(--color-text-soft)]">
                {locale === "uk"
                  ? "Запустіть preview, щоб побачити created/updated/skipped/failed до запису в базу."
                  : locale === "ru"
                    ? "Запустите preview, чтобы увидеть created/updated/skipped/failed до записи в базу."
                    : "Run preview to inspect created/updated/skipped/failed before writing to the database."}
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
