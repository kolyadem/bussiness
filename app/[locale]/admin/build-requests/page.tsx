import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/routing";
import { getAdminBuildRequests } from "@/lib/admin";
import {
  BUILD_REQUEST_STATUSES,
  getBuildRequestDeliveryMethodLabel,
  getBuildRequestNumber,
  getBuildRequestStatusLabel,
  getBuildRequestStatusTone,
  isBuildRequestDeliveryMethod,
  isBuildRequestStatus,
  type BuildRequestDeliveryMethod,
  type BuildRequestStatus,
} from "@/lib/storefront/build-requests";
import { formatPrice } from "@/lib/utils";

const SORT_OPTIONS = [
  "created_desc",
  "created_asc",
  "updated_desc",
  "updated_asc",
] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

function getCopy(locale: "uk" | "ru" | "en") {
  if (locale === "uk") {
    return {
      title: "Заявки на збірку",
      subtitle: "Список запитів на підбір ПК та конфігурації з configurator.",
      countLabel: "заявок у вибірці",
      empty: "За поточними фільтрами заявки не знайдено.",
      searchLabel: "Пошук",
      searchPlaceholder: "Ім'я, контакт, сценарій або нотатка",
      statusLabel: "Статус",
      sortLabel: "Сортування",
      apply: "Застосувати",
      reset: "Скинути",
      quickInquiry: "Швидка заявка",
      account: "Акаунт",
      useCase: "Сценарій",
      city: "Місто",
      delivery: "Доставка",
      build: "Збірка",
      budget: "Бюджет / сума",
      created: "Створено",
      updated: "Оновлено",
      notSpecified: "Не вказано",
      open: "Відкрити",
      withNote: "Є нотатка",
      allStatuses: "Усі статуси",
      sorts: {
        created_desc: "Новіші спочатку",
        created_asc: "Старіші спочатку",
        updated_desc: "Нещодавно оновлені",
        updated_asc: "Давно не оновлювалися",
      },
    };
  }

  if (locale === "ru") {
    return {
      title: "Заявки на сборку",
      subtitle: "Список запросов на подбор ПК и конфигурации из configurator.",
      countLabel: "заявок в выборке",
      empty: "По текущим фильтрам заявок не найдено.",
      searchLabel: "Поиск",
      searchPlaceholder: "Имя, контакт, сценарий или заметка",
      statusLabel: "Статус",
      sortLabel: "Сортировка",
      apply: "Применить",
      reset: "Сбросить",
      quickInquiry: "Быстрая заявка",
      account: "Аккаунт",
      useCase: "Сценарий",
      city: "Город",
      delivery: "Доставка",
      build: "Сборка",
      budget: "Бюджет / сумма",
      created: "Создано",
      updated: "Обновлено",
      notSpecified: "Не указано",
      open: "Открыть",
      withNote: "Есть заметка",
      allStatuses: "Все статусы",
      sorts: {
        created_desc: "Сначала новые",
        created_asc: "Сначала старые",
        updated_desc: "Недавно обновленные",
        updated_asc: "Давно не обновлялись",
      },
    };
  }

  return {
    title: "Build requests",
    subtitle: "Requests from quick inquiries and configurator-based build submissions.",
    countLabel: "requests in view",
    empty: "No requests match the current filters.",
    searchLabel: "Search",
    searchPlaceholder: "Name, contact, use case, or note",
    statusLabel: "Status",
    sortLabel: "Sort",
    apply: "Apply",
    reset: "Reset",
    quickInquiry: "Quick inquiry",
    account: "Account",
    useCase: "Use case",
    city: "City",
    delivery: "Delivery",
    build: "Build",
    budget: "Budget / total",
    created: "Created",
    updated: "Updated",
    notSpecified: "Not specified",
    open: "Open",
    withNote: "Has note",
    allStatuses: "All statuses",
    sorts: {
      created_desc: "Newest first",
      created_asc: "Oldest first",
      updated_desc: "Recently updated",
      updated_asc: "Least recently updated",
    },
  };
}

function normalizeSort(value: string | undefined): SortOption {
  return SORT_OPTIONS.includes(value as SortOption) ? (value as SortOption) : "created_desc";
}

function formatDate(date: Date, locale: "uk" | "ru" | "en") {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminBuildRequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: "uk" | "ru" | "en" }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const copy = getCopy(locale);
  const queryParam = rawSearchParams.q;
  const statusParam = rawSearchParams.status;
  const sortParam = rawSearchParams.sort;
  const query =
    typeof queryParam === "string" ? queryParam.trim() : Array.isArray(queryParam) ? queryParam[0]?.trim() ?? "" : "";
  const status =
    typeof statusParam === "string" && isBuildRequestStatus(statusParam) ? statusParam : "ALL";
  const sort = normalizeSort(typeof sortParam === "string" ? sortParam : Array.isArray(sortParam) ? sortParam[0] : undefined);
  const requests = await getAdminBuildRequests({
    query,
    status,
    sort,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] p-6">
        <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">{copy.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)]">{copy.subtitle}</p>
        <p className="mt-4 text-sm text-[color:var(--color-text-soft)]">
          {requests.length} {copy.countLabel}
        </p>
      </section>

      <section className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]">
        <form className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_220px_220px_auto_auto] xl:items-end">
          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.searchLabel}</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={copy.searchPlaceholder}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
          </label>

          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.statusLabel}</span>
            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            >
              <option value="ALL">{copy.allStatuses}</option>
              {BUILD_REQUEST_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {getBuildRequestStatusLabel(option, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
            <span>{copy.sortLabel}</span>
            <select
              name="sort"
              defaultValue={sort}
              className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {copy.sorts[option]}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" className="xl:min-w-32">
            {copy.apply}
          </Button>

          <Link href="/admin/build-requests" className="xl:min-w-32">
            <Button type="button" variant="secondary" className="w-full">
              {copy.reset}
            </Button>
          </Link>
        </form>
      </section>

      <section className="grid gap-4">
        {requests.length === 0 ? (
          <article className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 text-sm leading-7 text-[color:var(--color-text-soft)] shadow-[var(--shadow-soft)]">
            {copy.empty}
          </article>
        ) : (
          requests.map((request) => {
            const statusValue: BuildRequestStatus = isBuildRequestStatus(request.status) ? request.status : "NEW";
            const deliveryMethod: BuildRequestDeliveryMethod = isBuildRequestDeliveryMethod(request.deliveryMethod ?? "")
              ? (request.deliveryMethod as BuildRequestDeliveryMethod)
              : "NOVA_POSHTA_BRANCH";
            const isInquiryOnly = request.totalPrice > 0 && request.build.totalPrice === 0;

            return (
              <article
                key={request.id}
                className="rounded-[1.8rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                        {getBuildRequestNumber(request.id)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${getBuildRequestStatusTone(statusValue)}`}
                      >
                        {getBuildRequestStatusLabel(statusValue, locale)}
                      </span>
                      {isInquiryOnly ? (
                        <span className="rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text)]">
                          {copy.quickInquiry}
                        </span>
                      ) : null}
                      {request.userId ? (
                        <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                          {copy.account}
                        </span>
                      ) : null}
                      {request.managerNote ? (
                        <span className="rounded-full border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-text-soft)]">
                          {copy.withNote}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-[color:var(--color-text)]">{request.customerName}</h3>
                      <p className="mt-1 break-words text-sm text-[color:var(--color-text-soft)]">
                        {request.phone ?? request.contact}
                        {request.email ? ` · ${request.email}` : ""}
                      </p>
                    </div>

                    <div className="grid gap-1 text-sm text-[color:var(--color-text-soft)]">
                      <p>
                        {copy.useCase}: <span className="text-[color:var(--color-text)]">{request.useCase ?? "—"}</span>
                      </p>
                      <p>
                        {copy.city}: <span className="text-[color:var(--color-text)]">{request.deliveryCity ?? "—"}</span>
                      </p>
                      <p>
                        {copy.delivery}:{" "}
                        <span className="text-[color:var(--color-text)]">
                          {request.deliveryMethod
                            ? getBuildRequestDeliveryMethodLabel(deliveryMethod, locale)
                            : copy.notSpecified}
                        </span>
                      </p>
                      <p>
                        {copy.build}: <span className="text-[color:var(--color-text)]">{request.build.name}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-[260px] flex-col items-start gap-3 xl:items-end">
                    <div className="w-full rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 xl:max-w-[280px]">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-text-soft)]">
                        {copy.budget}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-[color:var(--color-text)]">
                        {formatPrice(
                          request.budget ?? (request.totalPrice > 0 ? request.totalPrice : request.build.totalPrice),
                          locale,
                          request.currency,
                        )}
                      </p>
                    </div>

                    <div className="w-full rounded-[1.3rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text-soft)] xl:max-w-[280px]">
                      <p>
                        {copy.created}: <span className="text-[color:var(--color-text)]">{formatDate(request.createdAt, locale)}</span>
                      </p>
                      <p className="mt-2">
                        {copy.updated}: <span className="text-[color:var(--color-text)]">{formatDate(request.updatedAt, locale)}</span>
                      </p>
                    </div>

                    <Link href={`/admin/build-requests/${request.id}`}>
                      <Button variant="secondary">{copy.open}</Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
