import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { ConfiguratorChooseButton } from "@/components/configurator/configurator-choose-button";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getCompatibilityAdditionalMessagesLabel,
  getCompatibilityStatusBadgeLabel,
  getCompatibilityStatusTone,
} from "@/lib/compatibility/presentation";
import type { AppLocale } from "@/lib/constants";
import { Link } from "@/lib/i18n/routing";
import { isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import {
  getConfiguratorBuild,
  getConfiguratorProductsForSlot,
  getConfiguratorSlotView,
  isConfiguratorCompatibleFilterAvailable,
  type ConfiguratorMemoryTypeFilter,
  type ConfiguratorSelectionSort,
  type ConfiguratorVendorFilter,
} from "@/lib/storefront/configurator-data";
import { pageMetadata } from "@/lib/storefront/seo";

const vendorOptions = ["intel", "amd", "nvidia"] as const;
const memoryTypeOptions = ["DDR4", "DDR5"] as const;
const sortOptions = ["featured", "price-asc", "price-desc", "rating"] as const;

function getFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getVendorFilter(value: string): ConfiguratorVendorFilter | null {
  return vendorOptions.includes(value as ConfiguratorVendorFilter)
    ? (value as ConfiguratorVendorFilter)
    : null;
}

function getMemoryTypeFilter(value: string): ConfiguratorMemoryTypeFilter | null {
  return memoryTypeOptions.includes(value as ConfiguratorMemoryTypeFilter)
    ? (value as ConfiguratorMemoryTypeFilter)
    : null;
}

function getSortFilter(value: string): ConfiguratorSelectionSort {
  return sortOptions.includes(value as ConfiguratorSelectionSort)
    ? (value as ConfiguratorSelectionSort)
    : "featured";
}

function buildSelectHref(
  params: Record<string, string | string[] | undefined>,
  updates: Record<string, string | null | undefined>,
) {
  const nextParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (key in updates) {
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        if (value) {
          nextParams.append(key, value);
        }
      }
      continue;
    }

    if (rawValue) {
      nextParams.set(key, rawValue);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      continue;
    }

    nextParams.set(key, value);
  }

  const query = nextParams.toString();
  return query.length > 0 ? `/configurator/select?${query}` : "/configurator/select";
}

function pillClassName(active: boolean) {
  return [
    "inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition",
    active
      ? "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)]"
      : "border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)] hover:border-[color:var(--color-line-strong)] hover:text-[color:var(--color-text)]",
  ].join(" ");
}

function getVendorChoices(slot: string) {
  if (slot === "cpu") {
    return [
      { value: "intel" as const, label: "Intel" },
      { value: "amd" as const, label: "AMD" },
    ];
  }

  if (slot === "gpu") {
    return [
      { value: "amd" as const, label: "AMD" },
      { value: "nvidia" as const, label: "NVIDIA" },
    ];
  }

  return [];
}

function getMemoryTypeChoices(slot: string) {
  if (slot !== "motherboard" && slot !== "ram") {
    return [];
  }

  return [
    { value: "DDR4" as const, label: "DDR4" },
    { value: "DDR5" as const, label: "DDR5" },
  ];
}

function getSortLabel(sort: ConfiguratorSelectionSort, locale: AppLocale) {
  switch (sort) {
    case "price-asc":
      return locale === "uk"
        ? "Ціна: від дешевших"
        : locale === "ru"
          ? "Цена: сначала дешевле"
          : "Price: low to high";
    case "price-desc":
      return locale === "uk"
        ? "Ціна: від дорожчих"
        : locale === "ru"
          ? "Цена: сначала дороже"
          : "Price: high to low";
    case "rating":
      return locale === "uk" ? "За рейтингом" : locale === "ru" ? "По рейтингу" : "Top rated";
    case "featured":
    default:
      return locale === "uk" ? "Рекомендовані" : locale === "ru" ? "Рекомендуемые" : "Featured";
  }
}

function getCompatibilityBadgeCopy(status: "pass" | "warning" | "fail", locale: AppLocale) {
  return getCompatibilityStatusBadgeLabel(status, locale);
  if (status === "pass") {
    return locale === "uk" ? "Сумісно" : locale === "ru" ? "Совместимо" : "Compatible";
  }

  if (status === "warning") {
    return locale === "uk" ? "Є попередження" : locale === "ru" ? "Есть предупреждение" : "Warning";
  }

  return locale === "uk" ? "Несумісно" : locale === "ru" ? "Несовместимо" : "Incompatible";
}

function getCompatibilityTone(status: "pass" | "warning" | "fail") {
  return getCompatibilityStatusTone(status);
  if (status === "pass") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
  }

  if (status === "warning") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-600";
  }

  return "border-rose-500/20 bg-rose-500/10 text-rose-600";
}

function getCompatibilityIcon(status: "pass" | "warning" | "fail") {
  if (status === "pass") {
    return CheckCircle2;
  }

  if (status === "warning") {
    return AlertTriangle;
  }

  return XCircle;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return pageMetadata(
    locale,
    "catalogSeoTitle",
    locale === "uk"
      ? "Вибір компонента для PC Configurator."
      : locale === "ru"
        ? "Выбор компонента для PC Configurator."
        : "Choose a component for the PC Configurator.",
    "/configurator/select",
    {
      title:
        locale === "uk"
          ? "PC Configurator: component selection"
          : locale === "ru"
            ? "PC Configurator: выбор компонента"
            : "PC Configurator: component selection",
      indexable: false,
    },
  );
}

export default async function ConfiguratorSelectPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const slot = getFirst(rawSearchParams.slot);
  const buildSlug = getFirst(rawSearchParams.build) || null;
  const search = getFirst(rawSearchParams.q).trim();
  const vendor = getVendorFilter(getFirst(rawSearchParams.vendor).trim().toLowerCase());
  const memoryType = getMemoryTypeFilter(getFirst(rawSearchParams.memoryType).trim().toUpperCase());
  const sort = getSortFilter(getFirst(rawSearchParams.sort).trim());
  const compatibleOnly = getFirst(rawSearchParams.compatible) === "1";

  if (!isConfiguratorSlotKey(slot)) {
    notFound();
  }

  const [build, slots] = await Promise.all([
    buildSlug ? getConfiguratorBuild(buildSlug, locale) : Promise.resolve(null),
    Promise.resolve(getConfiguratorSlotView(locale)),
  ]);
  const compatibilityFilterAvailable = await isConfiguratorCompatibleFilterAvailable(slot, build);
  const products = await getConfiguratorProductsForSlot({
    slot,
    locale,
    search,
    buildSlug,
    vendor,
    memoryType,
    compatibleOnly: compatibilityFilterAvailable ? compatibleOnly : false,
    sort,
  });
  const slotView = slots.find((item) => item.key === slot);

  if (!slotView) {
    notFound();
  }

  const currentSelection = build?.itemsBySlot[slot] ?? null;
  const backHref = buildSlug ? `/configurator?build=${buildSlug}` : "/configurator";
  const vendorChoices = getVendorChoices(slot);
  const memoryChoices = getMemoryTypeChoices(slot);

  return (
    <main className="storefront-shell mx-auto w-full max-w-[1640px] px-4 py-8 sm:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <Link
              href={backHref}
              className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
            >
              {locale === "uk"
                ? "Повернутися до configurator"
                : locale === "ru"
                  ? "Вернуться в configurator"
                  : "Back to configurator"}
            </Link>
            <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-5xl">
              {slotView.label}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
              {slotView.description}
            </p>
          </div>

          <form className="w-full max-w-2xl">
            <input type="hidden" name="slot" value={slot} />
            {buildSlug ? <input type="hidden" name="build" value={buildSlug} /> : null}
            {vendor ? <input type="hidden" name="vendor" value={vendor} /> : null}
            {memoryType ? <input type="hidden" name="memoryType" value={memoryType} /> : null}
            {compatibilityFilterAvailable && compatibleOnly ? (
              <input type="hidden" name="compatible" value="1" />
            ) : null}
            {sort !== "featured" ? <input type="hidden" name="sort" value={sort} /> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                name="q"
                defaultValue={search}
                placeholder={
                  locale === "uk"
                    ? "Пошук за назвою або SKU"
                    : locale === "ru"
                      ? "Поиск по названию или SKU"
                      : "Search by product name or SKU"
                }
                className="h-12 flex-1 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
              />
              <Button type="submit" variant="secondary" className="sm:min-w-[132px]">
                {locale === "uk" ? "Знайти" : locale === "ru" ? "Найти" : "Search"}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          {vendorChoices.map((option) => {
            const nextVendor = vendor === option.value ? null : option.value;
            return (
              <Link
                key={option.value}
                href={buildSelectHref(rawSearchParams, { vendor: nextVendor })}
                className={pillClassName(vendor === option.value)}
              >
                {option.label}
              </Link>
            );
          })}

          {memoryChoices.map((option) => {
            const nextMemoryType = memoryType === option.value ? null : option.value;
            return (
              <Link
                key={option.value}
                href={buildSelectHref(rawSearchParams, { memoryType: nextMemoryType })}
                className={pillClassName(memoryType === option.value)}
              >
                {option.label}
              </Link>
            );
          })}

          {compatibilityFilterAvailable ? (
            <Link
              href={buildSelectHref(rawSearchParams, {
                compatible: compatibleOnly ? null : "1",
              })}
              className={pillClassName(compatibleOnly)}
            >
              {locale === "uk"
                ? "Тільки сумісні"
                : locale === "ru"
                  ? "Только совместимые"
                  : "Only compatible"}
            </Link>
          ) : null}

          <div className="h-5 w-px bg-[color:var(--color-line)]" aria-hidden="true" />

          {sortOptions.map((option) => (
            <Link
              key={option}
              href={buildSelectHref(rawSearchParams, {
                sort: option === "featured" ? null : option,
              })}
              className={pillClassName(sort === option)}
            >
              {getSortLabel(option, locale)}
            </Link>
          ))}
        </div>

        {currentSelection ? (
          <div className="mt-6 rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
            {locale === "uk"
              ? `Зараз у слоті: ${currentSelection.product.name}`
              : locale === "ru"
                ? `Сейчас в слоте: ${currentSelection.product.name}`
                : `Currently selected: ${currentSelection.product.name}`}
          </div>
        ) : null}
      </section>

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState
            title={
              locale === "uk"
                ? "Нічого не знайдено для цього слота"
                : locale === "ru"
                  ? "Ничего не найдено для этого слота"
                  : "Nothing matched this slot"
            }
            description={
              locale === "uk"
                ? "Спробуйте інший пошук або приберіть частину фільтрів, щоб побачити більше товарів."
                : locale === "ru"
                  ? "Попробуйте другой запрос или снимите часть фильтров, чтобы увидеть больше товаров."
                  : "Try another search or remove some filters to see more products."
            }
            action={
              <Link
                href={buildSelectHref(rawSearchParams, {
                  q: null,
                  vendor: null,
                  memoryType: null,
                  compatible: null,
                  sort: null,
                })}
              >
                <Button variant="secondary">
                  {locale === "uk" ? "Скинути фільтри" : locale === "ru" ? "Сбросить фильтры" : "Reset filters"}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                locale={locale}
                showActions={false}
                footer={
                  <div className="grid gap-3">
                    {product.compatibility ? (
                      <div
                        className={[
                          "rounded-[1.2rem] border px-4 py-3",
                          getCompatibilityTone(product.compatibility.status),
                        ].join(" ")}
                      >
                        <div className="flex items-start gap-2.5">
                          {(() => {
                            const Icon = getCompatibilityIcon(product.compatibility.status);

                            return <Icon className="mt-0.5 h-4 w-4 shrink-0" />;
                          })()}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {getCompatibilityBadgeCopy(product.compatibility.status, locale)}
                            </p>
                            {product.compatibility.errors[0] ? (
                              <p className="mt-1 text-sm leading-6">
                                {product.compatibility.errors[0].message}
                              </p>
                            ) : product.compatibility.warnings[0] ? (
                              <p className="mt-1 text-sm leading-6">
                                {product.compatibility.warnings[0].message}
                              </p>
                            ) : null}
                            {product.compatibility.summary.errorCount +
                              product.compatibility.summary.warningCount >
                            1 ? (
                              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-current/75">
                                {getCompatibilityAdditionalMessagesLabel(
                                  product.compatibility.summary.errorCount +
                                    product.compatibility.summary.warningCount -
                                    1,
                                  locale,
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <ConfiguratorChooseButton
                      slot={slot}
                      productId={product.id}
                      buildSlug={build?.slug}
                      buildName={build?.name}
                      disabled={product.compatibility?.status === "fail"}
                    />
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
