import { notFound } from "next/navigation";
import { ImportRerunButton } from "@/components/admin/import-rerun-button";
import { getAdminImportJobById, requireAdminOnlyAccess } from "@/lib/admin";
import { Link } from "@/lib/i18n/routing";
import {
  getImportIssueSeverityLabel,
  getImportIssueSeverityTone,
  getImportJobStatusLabel,
  getImportJobStatusTone,
  getImportModeLabel,
  getImportSourceTypeLabel,
  isImportIssueSeverity,
  isImportJobStatus,
  isImportMode,
  isImportSourceType,
  type ImportIssueSeverity,
  type ImportJobStatus,
  type ImportMode,
  type ImportSourceType,
} from "@/lib/admin/imports/types";
import { parseJson } from "@/lib/utils";

export default async function AdminImportDetailPage({
  params,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en"; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminOnlyAccess(locale);
  const job = await getAdminImportJobById(id);

  if (!job) {
    notFound();
  }

  const status = isImportJobStatus(job.status)
    ? (job.status as ImportJobStatus)
    : ("FAILED" as ImportJobStatus);
  const sourceType = isImportSourceType(job.sourceType)
    ? (job.sourceType as ImportSourceType)
    : ("API_JSON" as ImportSourceType);
  const importMode = isImportMode(job.importMode)
    ? (job.importMode as ImportMode)
    : ("UPSERT" as ImportMode);
  const report = parseJson<Record<string, unknown>>(job.report, {});

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <Link href="/admin/imports" className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]">
          {locale === "uk" ? "Назад до Import Center" : locale === "ru" ? "Назад в Import Center" : "Back to Import Center"}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
            {job.dryRun ? "Dry-run preview" : `Import job #${job.id.slice(-8).toUpperCase()}`}
          </h2>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getImportJobStatusTone(status)}`}>
            {getImportJobStatusLabel(status, locale)}
          </span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              {locale === "uk" ? "Джерело та режим" : locale === "ru" ? "Источник и режим" : "Source and mode"}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  {locale === "uk" ? "Джерело" : locale === "ru" ? "Источник" : "Source"}
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {job.sourceConfig?.name ?? job.sourceFileName ?? job.sourceUrl ?? "Ad-hoc source"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                  {getImportSourceTypeLabel(sourceType, locale)}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  {locale === "uk" ? "Режим" : locale === "ru" ? "Режим" : "Mode"}
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {getImportModeLabel(importMode, locale)}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-text-soft)]">
                  {job.dryRun ? "Dry-run" : "Persist"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  {locale === "uk" ? "Почато" : locale === "ru" ? "Запущено" : "Started"}
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {job.startedAt ? job.startedAt.toLocaleString(locale) : "—"}
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                <p className="text-sm text-[color:var(--color-text-soft)]">
                  {locale === "uk" ? "Завершено" : locale === "ru" ? "Завершено" : "Completed"}
                </p>
                <p className="mt-2 text-lg font-medium text-[color:var(--color-text)]">
                  {job.completedAt ? job.completedAt.toLocaleString(locale) : "—"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              {locale === "uk" ? "Підсумок імпорту" : locale === "ru" ? "Итог импорта" : "Import summary"}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: locale === "uk" ? "Рядків" : locale === "ru" ? "Строк" : "Rows", value: job.totalRows },
                { label: locale === "uk" ? "Created" : locale === "ru" ? "Created" : "Created", value: job.createdCount },
                { label: locale === "uk" ? "Updated" : locale === "ru" ? "Updated" : "Updated", value: job.updatedCount },
                { label: locale === "uk" ? "Skipped" : locale === "ru" ? "Skipped" : "Skipped", value: job.skippedCount },
                { label: locale === "uk" ? "Failed" : locale === "ru" ? "Failed" : "Failed", value: job.failedCount },
                { label: locale === "uk" ? "Warnings" : locale === "ru" ? "Warnings" : "Warnings", value: job.warningCount },
                { label: locale === "uk" ? "Errors" : locale === "ru" ? "Errors" : "Errors", value: job.errorCount },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-4">
                  <p className="text-sm text-[color:var(--color-text-soft)]">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-[color:var(--color-text)]">{item.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              {locale === "uk" ? "Error log" : locale === "ru" ? "Error log" : "Error log"}
            </h3>
            <div className="mt-4 grid gap-3">
              {job.issues.length === 0 ? (
                <div className="rounded-[1.4rem] border border-dashed border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-4 py-6 text-sm leading-7 text-[color:var(--color-text-soft)]">
                  {locale === "uk"
                    ? "Issue log порожній."
                    : locale === "ru"
                      ? "Issue log пуст."
                      : "Issue log is empty."}
                </div>
              ) : (
                job.issues.map((issue) => {
                  const severity = isImportIssueSeverity(issue.severity)
                    ? (issue.severity as ImportIssueSeverity)
                    : ("ERROR" as ImportIssueSeverity);

                  return (
                    <article key={issue.id} className={`rounded-[1.3rem] px-4 py-4 text-sm ${getImportIssueSeverityTone(severity)}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{getImportIssueSeverityLabel(severity, locale)}</span>
                        <span className="rounded-full border border-current/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                          {issue.code}
                        </span>
                        {issue.rowIndex ? (
                          <span className="text-xs opacity-80">
                            {locale === "uk" ? "Рядок" : locale === "ru" ? "Строка" : "Row"} #{issue.rowIndex}
                          </span>
                        ) : null}
                        {issue.rawIdentifier ? <span className="text-xs opacity-80">{issue.rawIdentifier}</span> : null}
                      </div>
                      <p className="mt-2 leading-6">{issue.message}</p>
                    </article>
                  );
                })
              )}
            </div>
          </article>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-[calc(var(--header-offset)+0.75rem)] xl:self-start">
          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              {locale === "uk" ? "Дії" : locale === "ru" ? "Действия" : "Actions"}
            </h3>
            <div className="mt-4 flex flex-wrap gap-3">
              <ImportRerunButton jobId={job.id} locale={locale} />
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
            <h3 className="text-xl font-semibold text-[color:var(--color-text)]">
              {locale === "uk" ? "Source config" : locale === "ru" ? "Source config" : "Source config"}
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-[color:var(--color-text-soft)]">
              <p>
                <span className="text-[color:var(--color-text)]">
                  {job.sourceConfig?.key ?? job.sourceKey ?? "—"}
                </span>
              </p>
              <p>{job.sourceConfig?.endpointUrl ?? job.sourceUrl ?? "—"}</p>
              <p>
                {(report.payloadSizeBytes as number | undefined)
                  ? `${report.payloadSizeBytes} bytes`
                  : "Payload size unavailable"}
              </p>
              <p>
                {locale === "uk" ? "Наступний sync" : locale === "ru" ? "Следующий sync" : "Next sync"}:{" "}
                <span className="text-[color:var(--color-text)]">
                  {job.sourceConfig?.nextSyncAt ? job.sourceConfig.nextSyncAt.toLocaleString(locale) : "—"}
                </span>
              </p>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
