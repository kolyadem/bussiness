import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import {
  getCompatibilityAdditionalMessagesLabel,
  getCompatibilityStatusTitle,
  getCompatibilityStatusTone,
} from "@/lib/compatibility/presentation";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import { getConfiguratorSlotView, getSharedConfiguratorBuild } from "@/lib/storefront/configurator-data";
import { pageMetadata } from "@/lib/storefront/seo";
import { formatPrice, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale; token: string }>;
}): Promise<Metadata> {
  const { locale, token } = await params;
  const build = await getSharedConfiguratorBuild(token, locale);

  return pageMetadata(
    locale,
    "homeSeoTitle",
    build ? build.name : "Поділена збірка ПК",
    `/configurator/share/${token}`,
    {
      title: build ? build.name : "Поділена збірка ПК",
      indexable: false,
    },
  );
}

export default async function SharedConfiguratorPage({
  params,
}: {
  params: Promise<{ locale: AppLocale; token: string }>;
}) {
  const { locale, token } = await params;
  const [build, slots] = await Promise.all([
    getSharedConfiguratorBuild(token, locale),
    Promise.resolve(getConfiguratorSlotView(locale)),
  ]);

  if (!build) {
    notFound();
  }

  const items = slots
    .map((slot) => ({
      slot,
      item: build.itemsBySlot[slot.key],
    }))
    .filter((entry) => entry.item);

  return (
    <main className="storefront-shell mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-6 shadow-[var(--shadow-strong)] sm:p-8">
        <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
          {build.name}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
          Це поділена конфігурація. Вона відображається як публічна вітрина збірки, а зібрати власну версію можна в configurator.
        </p>
        <div className="mt-6">
          <Link href="/configurator">
            <Button>
              Відкрити configurator
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          {items.map(({ slot, item }) =>
            item ? (
              <article
                key={slot.key}
                className="grid gap-4 rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)] md:grid-cols-[140px_minmax(0,1fr)]"
              >
                <ProductImageFrame src={item.product.heroImage} alt={item.product.name} className="rounded-[1.4rem]" />
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-accent-strong)]">
                    {slot.label}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-[color:var(--color-text)]">{item.product.name}</p>
                  <p className="mt-3 text-sm text-[color:var(--color-text-soft)]">{item.product.category.name}</p>
                  <p className="mt-4 font-heading text-2xl font-semibold text-[color:var(--color-text)]">
                    {formatPrice(item.product.price, locale, item.product.currency)}
                  </p>
                </div>
              </article>
            ) : null,
          )}
        </div>

        <aside className="h-fit rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-[calc(var(--header-offset)+0.75rem)]">
          <p className="text-sm uppercase tracking-[0.24em] text-[color:var(--color-accent-strong)]">
            Підсумок
          </p>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between gap-4 text-sm text-[color:var(--color-text-soft)]">
              <span>Позицій</span>
              <span className="font-medium text-[color:var(--color-text)]">{build.itemCount}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-[color:var(--color-text-soft)]">
                Сума
              </span>
              <span className="font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {formatPrice(build.totalPrice, locale, items[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE)}
              </span>
            </div>
            <div
              className={[
                "rounded-[1.3rem] border px-4 py-4",
                getCompatibilityStatusTone(build.compatibility.status),
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {build.compatibility.status === "pass" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                ) : build.compatibility.status === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {getCompatibilityStatusTitle(build.compatibility.status, locale)}
                  </p>
                  <p className="hidden text-sm font-medium">
                    {build.compatibility.status === "pass"
                      ? "Сумісна конфігурація"
                      : build.compatibility.status === "warning"
                        ? "Є попередження"
                        : "Є несумісності"}
                  </p>
                  {build.compatibility.errors[0] ? (
                    <p className="mt-2 text-sm leading-6">{build.compatibility.errors[0].message}</p>
                  ) : build.compatibility.warnings[0] ? (
                    <p className="mt-2 text-sm leading-6">{build.compatibility.warnings[0].message}</p>
                  ) : null}
                  {build.compatibility.errors.length + build.compatibility.warnings.length > 1 ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-current/75">
                      {getCompatibilityAdditionalMessagesLabel(
                        build.compatibility.errors.length +
                          build.compatibility.warnings.length -
                          1,
                        locale,
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
