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
import type { AppLocale } from "@/lib/constants";

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

function formatBytes(bytes: number, locale: string) {
  if (bytes >= 1_048_576) {
    return new Intl.NumberFormat(locale || "uk", {
      maximumFractionDigits: 1,
    }).format(bytes / 1_048_576) + " MB";
  }

  if (bytes >= 1024) {
    return new Intl.NumberFormat(locale || "uk", {
      maximumFractionDigits: 1,
    }).format(bytes / 1024) + " KB";
  }

  return `${bytes} B`;
}

function formatStableDateTime(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale || "uk", {
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
  locale: AppLocale;
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
          throw new Error(result?.error || "Запит імпорту не вдався");
        }

        setPreview(result);

        if (dryRun) {
          toast.success("Попередній перегляд готовий");
          return;
        }

        toast.success("Імпорт завершено");

        if (result.jobId) {
          window.location.assign(`/admin/imports/${result.jobId}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Запит імпорту не вдався";
        toast.error(message);
      } finally {
        setPending(false);
      }
    });
  }

  const copy = {
    launchTitle: "Новий імпорт товарів",
    launchText:
      "Перевірте джерело, режим синхронізації та спочатку запустіть безпечний dry-run preview.",
    sourcePreset: "Збережене джерело",
    customSource: "Нове джерело",
    sourceKey: "Ключ джерела",
    sourceName: "Назва джерела",
    sourceType: "Тип джерела",
    sourceUrl: "URL API / фіду",
    sourceFile: "Файл імпорту",
    importMode: "Режим імпорту",
    authType: "Авторизація",
    authToken: "API токен",
    authHeaders: "Додаткові заголовки (JSON)",
    limits: "Ліміти та надійність",
    timeout: "Таймаут, мс",
    retries: "Повтори",
    maxRows: "Макс. рядків",
    maxPayload: "Макс. розмір тіла запиту",
    matching: "Правила зіставлення",
    skuFallback: "Дозволити SKU fallback",
    slugFallback: "Дозволити slug fallback",
    schedule: "База для синхронізації",
    frequency: "Частота",
    nextSync: "Наступна синхронізація",
    saveSource: "Зберегти як шаблон джерела",
    preview: "Перевірити та переглянути",
    run: "Запустити імпорт",
    safeNote: "Dry-run не записує Product, зв’язані сутності чи зображення.",
    previewTitle: "Результат попереднього перегляду",
    created: "Створиться",
    updated: "Оновиться",
    skipped: "Пропуститься",
    failed: "З помилкою",
    totalRows: "Рядків",
    openJob: "Відкрити job",
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
            <p>Зіставлення externalId: `importSourceKey + externalId`</p>
            <p>SKU fallback: {skuFallbackEnabled ? "увімкнено" : "вимкнено"}</p>
            <p>Slug fallback: {slugFallbackEnabled ? "увімкнено" : "вимкнено"}</p>
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
                  placeholder="Основний фід постачальника"
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
                    {sourceFile ? sourceFile.name : "JSON, CSV, XML або YML"}
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
                  <option value="NONE">Без авторизації</option>
                  <option value="BEARER">Bearer-токен</option>
                  <option value="CUSTOM_HEADERS">Власні заголовки</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-[color:var(--color-text)]">{copy.authToken}</label>
                <input
                  value={authToken}
                  onChange={(event) => setAuthToken(event.target.value)}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  placeholder="Необов'язковий bearer-токен"
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
                  placeholder="щодня / щотижня / вручну"
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
                <p>{selectedSourceConfig.endpointUrl ?? "Локальне завантаження"}</p>
                <p>{getImportSourceTypeLabel(selectedSourceConfig.sourceType as ImportSourceType, locale)}</p>
                <p>
                  {formatBytes(selectedSourceConfig.maxPayloadBytes, locale)} / {selectedSourceConfig.maxRows} рядків
                </p>
                <p>
                  {selectedSourceConfig.lastSyncAt
                    ? `Останній sync: ${formatStableDateTime(selectedSourceConfig.lastSyncAt, locale)}`
                    : "Ще не синхронізувалось"}
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
                    href={`/admin/imports/${preview.jobId}`}
                    className="inline-flex text-sm font-medium text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                  >
                    {copy.openJob}
                  </a>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.4rem] border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-8 text-sm leading-7 text-[color:var(--color-text-soft)]">
                Запустіть попередній перегляд, щоб побачити кількість створених, оновлених, пропущених і з помилкою до запису в базу.
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}
