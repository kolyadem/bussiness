import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/storefront/seo";
import { getThanksPageData } from "@/lib/storefront/thanks-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "homeSeoTitle",
    "Сторінка підтвердження заявки або замовлення.",
    "/thanks",
    {
      title: "Заявку отримано",
      indexable: false,
    },
  );
}

function DetailList({
  rows,
}: {
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <dl className="grid gap-3">
      {rows.map((row) => (
        <div
          key={`${row.label}:${row.value}`}
          className="rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3"
        >
          <dt className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
            {row.label}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-[color:var(--color-text)] sm:text-[0.95rem]">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function ThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  let data = null;

  try {
    data = await getThanksPageData({
      locale,
      type: rawSearchParams.type,
      id: rawSearchParams.id,
    });
  } catch {
    data = null;
  }

  return (
    <main className="storefront-shell mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="overflow-hidden rounded-[2.4rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div className="bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_55%)] p-6 sm:p-8 lg:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.22em] text-[color:var(--color-accent-strong)]">
                Підтвердження
              </p>
              <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
                {data?.heading ?? "Заявку отримано"}
              </h1>
              <p className="mt-4 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
                {data?.message ?? "Заявку отримано, але деталі зараз недоступні."}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[color:var(--color-text)] px-6 text-sm font-medium text-[color:var(--color-surface)]"
            >
              На головну
            </Link>
            <Link
              href="/catalog"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[color:var(--color-line)] px-6 text-sm font-medium text-[color:var(--color-text)]"
            >
              До каталогу
            </Link>
            {data?.flowCta ? (
              <Link
                href={data.flowCta.href}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] px-6 text-sm font-medium text-[color:var(--color-text)]"
              >
                {data.flowCta.label}
              </Link>
            ) : null}
          </div>
        </div>

        {data ? (
          <div className="grid gap-6 border-t border-[color:var(--color-line)] p-6 sm:p-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <section className="rounded-[1.9rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5">
              <h2 className="font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                Ваші дані
              </h2>
              <div className="mt-4">
                <DetailList rows={data.customerDetails} />
              </div>
            </section>

            <section className="space-y-5">
              <div className="rounded-[1.9rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5">
                <h2 className="font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                  {data.summaryTitle}
                </h2>
                <div className="mt-4">
                  <DetailList rows={data.summaryDetails} />
                </div>
              </div>

              {data.summaryItems.length > 0 ? (
                <div className="rounded-[1.9rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5">
                  <div className="grid gap-3">
                    {data.summaryItems.map((item) => (
                      <article
                        key={`${item.title}:${item.subtitle ?? ""}:${item.quantity}`}
                        className="rounded-[1.35rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-base font-medium text-[color:var(--color-text)]">
                              {item.title}
                            </h3>
                            {item.subtitle ? (
                              <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-soft)]">
                                {item.subtitle}
                              </p>
                            ) : null}
                          </div>
                          <p className="text-sm font-medium text-[color:var(--color-text)]">
                            Разом: {item.totalPrice}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[color:var(--color-text-soft)]">
                          <span>Кількість: {item.quantity}</span>
                          <span>Ціна: {item.unitPrice}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}
