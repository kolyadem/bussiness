import { AlertTriangle, Clock3, RefreshCw, Siren, TriangleAlert } from "lucide-react";
import { ImportAlertActions } from "@/components/admin/import-alert-actions";
import { ImportCenter } from "@/components/admin/import-center";
import { ImportSourceActions } from "@/components/admin/import-source-actions";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAdminImportAlerts,
  getAdminImportJobs,
  getAdminImportSourceConfigs,
  requireAdminOnlyAccess,
} from "@/lib/admin";
import {
  getImportAlertSeverityLabel,
  getImportAlertSeverityTone,
  getImportAlertStatusLabel,
  getImportAlertStatusTone,
  isImportAlertSeverity,
  isImportAlertStatus,
  type ImportAlertSeverity,
  type ImportAlertStatus,
} from "@/lib/admin/imports/alerts";
import {
  getImportJobStatusLabel,
  getImportJobStatusTone,
  getImportModeLabel,
  getImportSourceTypeLabel,
  isImportJobStatus,
  isImportMode,
  isImportSourceType,
  type ImportJobStatus,
  type ImportMode,
  type ImportSourceType,
} from "@/lib/admin/imports/types";
import { Link } from "@/lib/i18n/routing";
import { parseJson } from "@/lib/utils";

type AlertFilter = "active" | "resolved" | "all";

function resolveAlertFilter(value: string | string[] | undefined): AlertFilter {
  if (value === "resolved") {
    return "resolved";
  }

  if (value === "all") {
    return "all";
  }

  return "active";
}

function getAlertFilterHref(filter: AlertFilter) {
  if (filter === "active") {
    return "/admin/imports";
  }

  return `/admin/imports?alerts=${filter}`;
}

function formatRelativeStatus(locale: "uk" | "ru" | "en", active: boolean) {
  if (active) {
    return locale === "uk" ? "Активний" : locale === "ru" ? "Активный" : "Active";
  }

  return locale === "uk" ? "На паузі" : locale === "ru" ? "На паузе" : "Paused";
}

export default async function AdminImportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en" }>;
  searchParams: Promise<{ alerts?: string | string[] }>;
}) {
  const { locale } = await params;
  await requireAdminOnlyAccess(locale);
  const query = await searchParams;
  const alertFilter = resolveAlertFilter(query.alerts);
  const [jobs, sourceConfigs, allAlerts] = await Promise.all([
    getAdminImportJobs(24),
    getAdminImportSourceConfigs(),
    getAdminImportAlerts("ALL"),
  ]);

  const alerts = allAlerts.filter((alert) => {
    if (alertFilter === "resolved") {
      return alert.status === "RESOLVED";
    }

    if (alertFilter === "all") {
      return true;
    }

    return alert.status === "ACTIVE" || alert.status === "ACKNOWLEDGED";
  });

  const activeAlerts = allAlerts.filter(
    (alert) => alert.status === "ACTIVE" || alert.status === "ACKNOWLEDGED",
  );
  const resolvedAlerts = allAlerts.filter((alert) => alert.status === "RESOLVED");
  const sourceAlertMap = new Map<
    string,
    {
      total: number;
      critical: number;
      error: number;
      warning: number;
    }
  >();

  for (const alert of activeAlerts) {
    const current = sourceAlertMap.get(alert.sourceConfigId) ?? {
      total: 0,
      critical: 0,
      error: 0,
      warning: 0,
    };

    current.total += 1;
    if (alert.severity === "CRITICAL") {
      current.critical += 1;
    } else if (alert.severity === "ERROR") {
      current.error += 1;
    } else if (alert.severity === "WARNING") {
      current.warning += 1;
    }
    sourceAlertMap.set(alert.sourceConfigId, current);
  }

  const copy = {
    title: "Import Center",
    subtitle:
      locale === "uk"
        ? "Масовий імпорт товарів з preview, dry-run, історією job-ів, збереженими source configs і сигналами по health імпортів."
        : locale === "ru"
          ? "Массовый импорт товаров с preview, dry-run, историей job-ов, сохранёнными source configs и сигналами по health импортов."
          : "Bulk product import with preview, dry-run, saved source configs, job history, and import health alerts.",
    alertFeed: locale === "uk" ? "Import alerts" : locale === "ru" ? "Import alerts" : "Import alerts",
    alertFeedText:
      locale === "uk"
        ? "Активні проблеми видно одразу: повторні падіння, застарілий sync, stuck execution та критичні source errors."
        : locale === "ru"
          ? "Активные проблемы видны сразу: повторные падения, устаревший sync, stuck execution и критические source errors."
          : "Critical import health signals stay visible here: repeated failures, stale sync, stuck execution, and source-level errors.",
    active: locale === "uk" ? "Активні" : locale === "ru" ? "Активные" : "Active",
    resolved: locale === "uk" ? "Вирішені" : locale === "ru" ? "Решённые" : "Resolved",
    all: locale === "uk" ? "Усі" : locale === "ru" ? "Все" : "All",
    noAlerts:
      locale === "uk"
        ? "Зараз немає import alerts для цього фільтра."
        : locale === "ru"
          ? "Сейчас нет import alerts для этого фильтра."
          : "No import alerts for this filter right now.",
    issueStarted:
      locale === "uk" ? "Проблема з" : locale === "ru" ? "Проблема с" : "Started",
    lastSeen:
      locale === "uk" ? "Останній сигнал" : locale === "ru" ? "Последний сигнал" : "Last seen",
    occurrences: locale === "uk" ? "Повторів" : locale === "ru" ? "Повторов" : "Occurrences",
    source: locale === "uk" ? "Джерело" : locale === "ru" ? "Источник" : "Source",
    relatedJob: locale === "uk" ? "Пов’язаний job" : locale === "ru" ? "Связанный job" : "Related job",
    history: locale === "uk" ? "Історія імпортів" : locale === "ru" ? "История импортов" : "Import history",
    sourceStatus:
      locale === "uk" ? "Saved sources" : locale === "ru" ? "Saved sources" : "Saved sources",
    templates:
      locale === "uk" ? "Sample templates" : locale === "ru" ? "Sample templates" : "Sample templates",
    noHistory:
      locale === "uk"
        ? "Import jobs ще не запускалися."
        : locale === "ru"
          ? "Import jobs ещё не запускались."
          : "No import jobs yet.",
    open: locale === "uk" ? "Відкрити" : locale === "ru" ? "Открыть" : "Open",
    job: "Job",
    mode: locale === "uk" ? "Режим" : locale === "ru" ? "Режим" : "Mode",
    result: locale === "uk" ? "Підсумок" : locale === "ru" ? "Итог" : "Result",
    updated: locale === "uk" ? "Оновлено" : locale === "ru" ? "Обновлено" : "Updated",
    nextSync: locale === "uk" ? "Наступний sync" : locale === "ru" ? "Следующий sync" : "Next sync",
    lastSync: locale === "uk" ? "Останній sync" : locale === "ru" ? "Последний sync" : "Last sync",
    lastResult:
      locale === "uk" ? "Останній результат" : locale === "ru" ? "Последний результат" : "Last result",
    runningNow:
      locale === "uk" ? "Виконується зараз" : locale === "ru" ? "Выполняется сейчас" : "Running now",
    uploadSource:
      locale === "uk" ? "Локальний upload source" : locale === "ru" ? "Локальный upload source" : "Uploaded source",
    noSources:
      locale === "uk"
        ? "Поки що немає збережених джерел. Після першого запуску можна зберегти reusable source config."
        : locale === "ru"
          ? "Пока нет сохранённых источников. После первого запуска можно сохранить reusable source config."
          : "No saved sources yet. After the first run you can save a reusable source config.",
    consecutiveFailures:
      locale === "uk" ? "Провалів поспіль" : locale === "ru" ? "Падений подряд" : "Failures in a row",
    alerts: locale === "uk" ? "Alerts" : locale === "ru" ? "Alerts" : "Alerts",
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[color:var(--color-text-soft)]">
          {copy.subtitle}
        </p>
      </section>

      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.alertFeed}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">
              {copy.alertFeedText}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "active" as const,
                href: getAlertFilterHref("active"),
                label: `${copy.active} (${activeAlerts.length})`,
              },
              {
                key: "resolved" as const,
                href: getAlertFilterHref("resolved"),
                label: `${copy.resolved} (${resolvedAlerts.length})`,
              },
              {
                key: "all" as const,
                href: getAlertFilterHref("all"),
                label: `${copy.all} (${allAlerts.length})`,
              },
            ].map((tab) => {
              const selected = alertFilter === tab.key;

              return (
                <Link
                  key={tab.key}
                  href={tab.href}
                  className={`inline-flex rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition ${
                    selected
                      ? "border-[color:var(--color-accent-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)]"
                      : "border-[color:var(--color-line)] text-[color:var(--color-text-soft)] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-text)]"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="mt-5">
            <EmptyState title={copy.noAlerts} />
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {alerts.map((alert) => {
              const severity = isImportAlertSeverity(alert.severity)
                ? (alert.severity as ImportAlertSeverity)
                : ("ERROR" as ImportAlertSeverity);
              const status = isImportAlertStatus(alert.status)
                ? (alert.status as ImportAlertStatus)
                : ("ACTIVE" as ImportAlertStatus);
              const details = parseJson<Record<string, string | number | null>>(alert.details, {});
              const isResolved = status === "RESOLVED";

              return (
                <article
                  key={alert.id}
                  className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getImportAlertSeverityTone(severity)}`}
                        >
                          {getImportAlertSeverityLabel(severity, locale)}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getImportAlertStatusTone(status)}`}
                        >
                          {getImportAlertStatusLabel(status, locale)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                          <Siren className="h-3.5 w-3.5" />
                          {alert.type}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-[color:var(--color-text)]">
                          {alert.title}
                        </h4>
                        <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-soft)]">
                          {alert.message}
                        </p>
                      </div>
                    </div>

                    {!isResolved ? (
                      <ImportAlertActions alertId={alert.id} locale={locale} status={status} />
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-text-soft)] md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em]">{copy.source}</p>
                      <p className="mt-2 text-[color:var(--color-text)]">{alert.sourceConfig.name}</p>
                      <a
                        href={`#source-${alert.sourceConfigId}`}
                        className="mt-1 inline-flex text-xs text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                      >
                        {alert.sourceConfig.key}
                      </a>
                    </div>
                    <div className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em]">{copy.issueStarted}</p>
                      <p className="mt-2 text-[color:var(--color-text)]">
                        {alert.firstDetectedAt.toLocaleString(locale)}
                      </p>
                      <p className="mt-1 text-xs">{copy.lastSeen}: {alert.lastDetectedAt.toLocaleString(locale)}</p>
                    </div>
                    <div className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em]">{copy.occurrences}</p>
                      <p className="mt-2 text-[color:var(--color-text)]">{alert.occurrenceCount}</p>
                      {typeof details.consecutiveFailures === "number" ? (
                        <p className="mt-1 text-xs">
                          {copy.consecutiveFailures}: {details.consecutiveFailures}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em]">{copy.relatedJob}</p>
                      {alert.job ? (
                        <>
                          <Link
                            href={`/admin/imports/${alert.job.id}`}
                            className="mt-2 inline-flex text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                          >
                            #{alert.job.id.slice(-8).toUpperCase()}
                          </Link>
                          <p className="mt-1 text-xs">
                            {alert.job.triggerType} / {alert.job.status}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-[color:var(--color-text)]">—</p>
                      )}
                    </div>
                  </div>

                  {(details.nextSyncAt || details.syncLockedAt || details.lastSyncAt) ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-[color:var(--color-text-soft)]">
                      {details.nextSyncAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] px-3 py-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          next sync: {String(details.nextSyncAt)}
                        </span>
                      ) : null}
                      {details.lastSyncAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] px-3 py-1">
                          <RefreshCw className="h-3.5 w-3.5" />
                          last sync: {String(details.lastSyncAt)}
                        </span>
                      ) : null}
                      {details.syncLockedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-line)] px-3 py-1">
                          <TriangleAlert className="h-3.5 w-3.5" />
                          locked since: {String(details.syncLockedAt)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ImportCenter locale={locale} sourceConfigs={sourceConfigs} />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <article className="overflow-hidden rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
          <div className="border-b border-[color:var(--color-line)] px-6 py-5">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.history}</h3>
          </div>
          {jobs.length === 0 ? (
            <div className="p-6">
              <EmptyState title={copy.noHistory} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[color:var(--color-line)]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                    <th className="px-5 py-4">{copy.job}</th>
                    <th className="px-5 py-4">{copy.source}</th>
                    <th className="px-5 py-4">{copy.mode}</th>
                    <th className="px-5 py-4">{copy.result}</th>
                    <th className="px-5 py-4">{copy.updated}</th>
                    <th className="px-5 py-4 text-right">{copy.open}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-line)]">
                  {jobs.map((job) => {
                    const status = isImportJobStatus(job.status)
                      ? (job.status as ImportJobStatus)
                      : ("FAILED" as ImportJobStatus);
                    const sourceType = isImportSourceType(job.sourceType)
                      ? (job.sourceType as ImportSourceType)
                      : ("API_JSON" as ImportSourceType);
                    const importMode = isImportMode(job.importMode)
                      ? (job.importMode as ImportMode)
                      : ("UPSERT" as ImportMode);

                    return (
                      <tr key={job.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="space-y-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getImportJobStatusTone(status)}`}
                            >
                              {getImportJobStatusLabel(status, locale)}
                            </span>
                            <p className="text-sm font-medium text-[color:var(--color-text)]">
                              {job.dryRun ? "Dry-run preview" : `#${job.id.slice(-8).toUpperCase()}`}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
                          <p className="text-[color:var(--color-text)]">
                            {job.sourceConfig?.name ?? job.sourceFileName ?? job.sourceUrl ?? "Ad-hoc source"}
                          </p>
                          <p className="mt-1">{getImportSourceTypeLabel(sourceType, locale)}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
                          {getImportModeLabel(importMode, locale)}
                        </td>
                        <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
                          <p>
                            {job.createdCount} / {job.updatedCount} / {job.skippedCount} / {job.failedCount}
                          </p>
                          <p className="mt-1">
                            {job.warningCount} warnings · {job.errorCount} errors
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
                          {job.updatedAt.toLocaleString(locale)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/imports/${job.id}`}
                            className="text-sm font-medium text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                          >
                            {copy.open}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <aside className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)]">
          <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{copy.sourceStatus}</h3>
          <div className="mt-4 grid gap-4">
            <div className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
              <h4 className="font-medium text-[color:var(--color-text)]">{copy.templates}</h4>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <a
                  href="/import-templates/products-sample.json"
                  className="text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                >
                  JSON
                </a>
                <a
                  href="/import-templates/products-sample.csv"
                  className="text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                >
                  CSV
                </a>
                <a
                  href="/import-templates/products-sample.xml"
                  className="text-[color:var(--color-accent-strong)] transition hover:text-[color:var(--color-text)]"
                >
                  XML/YML
                </a>
              </div>
            </div>

            {sourceConfigs.length === 0 ? (
              <p className="text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.noSources}</p>
            ) : (
              sourceConfigs.map((config) => {
                const sourceAlerts = sourceAlertMap.get(config.id);

                return (
                  <article
                    key={config.id}
                    id={`source-${config.id}`}
                    className="rounded-[1.5rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-[color:var(--color-text)]">{config.name}</h4>
                        <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">{config.key}</p>
                      </div>
                      <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                        {getImportSourceTypeLabel(config.sourceType as ImportSourceType, locale)}
                      </span>
                    </div>

                    {sourceAlerts ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-rose-100">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {copy.alerts}: {sourceAlerts.total}
                        </span>
                        {sourceAlerts.critical > 0 ? (
                          <span className="inline-flex rounded-full border border-red-500/25 bg-red-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-red-100">
                            critical {sourceAlerts.critical}
                          </span>
                        ) : null}
                        {sourceAlerts.error > 0 ? (
                          <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-rose-100">
                            error {sourceAlerts.error}
                          </span>
                        ) : null}
                        {sourceAlerts.warning > 0 ? (
                          <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-100">
                            warning {sourceAlerts.warning}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 grid gap-2 text-sm text-[color:var(--color-text-soft)]">
                      <p>{config.endpointUrl ?? copy.uploadSource}</p>
                      <p>
                        {copy.lastResult}:{" "}
                        <span className="text-[color:var(--color-text)]">{config.lastSyncStatus ?? "—"}</span>
                      </p>
                      <p>
                        {copy.nextSync}:{" "}
                        <span className="text-[color:var(--color-text)]">
                          {config.nextSyncAt ? config.nextSyncAt.toLocaleString(locale) : "—"}
                        </span>
                      </p>
                      <p>
                        {copy.lastSync}:{" "}
                        <span className="text-[color:var(--color-text)]">
                          {config.lastSyncAt ? config.lastSyncAt.toLocaleString(locale) : "—"}
                        </span>
                      </p>
                      <p>{formatRelativeStatus(locale, config.isActive)}</p>
                      <p>
                        {copy.consecutiveFailures}:{" "}
                        <span className="text-[color:var(--color-text)]">{config.consecutiveFailures}</span>
                      </p>
                      {config.isSyncing ? <p className="text-sky-100">{copy.runningNow}</p> : null}
                      {config.lastSyncError ? <p className="text-rose-200">{config.lastSyncError}</p> : null}
                    </div>

                    <div className="mt-4">
                      <ImportSourceActions
                        sourceId={config.id}
                        locale={locale}
                        isActive={config.isActive}
                        isSyncing={config.isSyncing}
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
