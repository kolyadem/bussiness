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
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { isConfiguratorSlotKey } from "@/lib/storefront/configurator";
import {
  CONFIGURATOR_EMBED_PAGE,
  buildConfiguratorSelectionHref,
  type ConfiguratorPickerLocation,
} from "@/lib/storefront/configurator-selection-url";
import {
  getConfiguratorBuild,
  getConfiguratorProductsForSlot,
  getConfiguratorSlotView,
  isConfiguratorCompatibleFilterAvailable,
  type ConfiguratorMemoryTypeFilter,
  type ConfiguratorSelectionSort,
  type ConfiguratorVendorFilter,
} from "@/lib/storefront/configurator-data";

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

function getCompatibilityBadgeCopy(status: "pass" | "warning" | "fail", locale: AppLocale) {
  return getCompatibilityStatusBadgeLabel(status, locale);
}

function getCompatibilityTone(status: "pass" | "warning" | "fail") {
  return getCompatibilityStatusTone(status);
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

type ConfiguratorSlotSelectionProps = {
  locale: AppLocale;
  location: ConfiguratorPickerLocation;
  rawSearchParams: Record<string, string | string[] | undefined>;
};

export async function ConfiguratorSlotSelection({ locale, location, rawSearchParams }: ConfiguratorSlotSelectionProps) {
  const t = await getTranslations({ locale });
  const slotRaw = getFirst(rawSearchParams[location.slotParam]);
  const slot = slotRaw;

  if (!isConfiguratorSlotKey(slot)) {
    return null;
  }

  const buildSlug = getFirst(rawSearchParams.build) || null;
  const search = getFirst(rawSearchParams.q).trim();
  const vendor = getVendorFilter(getFirst(rawSearchParams.vendor).trim().toLowerCase());
  const memoryType = getMemoryTypeFilter(getFirst(rawSearchParams.memoryType).trim().toUpperCase());
  const sort = getSortFilter(getFirst(rawSearchParams.sort).trim());
  const compatibleOnly = getFirst(rawSearchParams.compatible) === "1";

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
    return null;
  }

  const currentSelection = build?.itemsBySlot[slot] ?? null;
  const backHref =
    location.pathname === CONFIGURATOR_EMBED_PAGE.pathname
      ? buildConfiguratorSelectionHref(CONFIGURATOR_EMBED_PAGE, rawSearchParams, { pick: null })
      : buildSlug
        ? `/configurator?build=${buildSlug}`
        : "/configurator";
  const vendorChoices = getVendorChoices(slot);
  const memoryChoices = getMemoryTypeChoices(slot);

  const hrefFor = (updates: Record<string, string | null | undefined>) =>
    buildConfiguratorSelectionHref(location, rawSearchParams, updates);

  const copyBack =
    location.pathname === CONFIGURATOR_EMBED_PAGE.pathname
      ? t("configuratorPickerBackEmbed")
      : t("configuratorPickerBackSelect");

  const sortLabel = (sort: ConfiguratorSelectionSort) => {
    switch (sort) {
      case "price-asc":
        return t("configuratorSortPriceAsc");
      case "price-desc":
        return t("configuratorSortPriceDesc");
      case "rating":
        return t("configuratorSortRating");
      case "featured":
      default:
        return t("configuratorSortFeatured");
    }
  };

  return (
    <section className="rounded-[2.3rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <Link
            href={backHref}
            className="text-sm text-[color:var(--color-text-soft)] transition hover:text-[color:var(--color-text)]"
          >
            {copyBack}
          </Link>
          <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-4xl">
            {slotView.label}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
            {slotView.description}
          </p>
        </div>

        <form className="w-full max-w-2xl" action={location.pathname} method="get">
          <input type="hidden" name={location.slotParam} value={slot} />
          {buildSlug ? <input type="hidden" name="build" value={buildSlug} /> : null}
          {vendor ? <input type="hidden" name="vendor" value={vendor} /> : null}
          {memoryType ? <input type="hidden" name="memoryType" value={memoryType} /> : null}
          {compatibilityFilterAvailable && compatibleOnly ? <input type="hidden" name="compatible" value="1" /> : null}
          {sort !== "featured" ? <input type="hidden" name="sort" value={sort} /> : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              name="q"
              defaultValue={search}
              placeholder={t("configuratorPickerSearchPlaceholder")}
              className="h-12 flex-1 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
            />
            <Button type="submit" variant="secondary" className="sm:min-w-[132px]">
              {t("configuratorPickerSearchAction")}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        {vendorChoices.map((option) => {
          const nextVendor = vendor === option.value ? null : option.value;
          return (
            <Link key={option.value} href={hrefFor({ vendor: nextVendor })} className={pillClassName(vendor === option.value)}>
              {option.label}
            </Link>
          );
        })}

        {memoryChoices.map((option) => {
          const nextMemoryType = memoryType === option.value ? null : option.value;
          return (
            <Link
              key={option.value}
              href={hrefFor({ memoryType: nextMemoryType })}
              className={pillClassName(memoryType === option.value)}
            >
              {option.label}
            </Link>
          );
        })}

        {compatibilityFilterAvailable ? (
          <Link
            href={hrefFor({
              compatible: compatibleOnly ? null : "1",
            })}
            className={pillClassName(compatibleOnly)}
          >
            {t("configuratorPickerCompatibleOnly")}
          </Link>
        ) : null}

        <div className="h-5 w-px bg-[color:var(--color-line)]" aria-hidden="true" />

        {sortOptions.map((option) => (
          <Link
            key={option}
            href={hrefFor({
              sort: option === "featured" ? null : option,
            })}
            className={pillClassName(sort === option)}
          >
            {sortLabel(option)}
          </Link>
        ))}
      </div>

      {currentSelection ? (
        <div className="mt-6 rounded-[1.6rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-5 py-4 text-sm text-[color:var(--color-text-soft)]">
          {t("configuratorPickerSelectedLabel")}: {currentSelection.product.name}
        </div>
      ) : null}

      <div className="mt-8">
        {products.length === 0 ? (
          <EmptyState
            title={t("configuratorPickerEmptyTitle")}
            description={t("configuratorPickerEmptyDescription")}
            action={
              <Link
                href={hrefFor({
                  q: null,
                  vendor: null,
                  memoryType: null,
                  compatible: null,
                  sort: null,
                })}
              >
                <Button variant="secondary">{t("configuratorPickerResetFilters")}</Button>
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
                              <p className="mt-1 text-sm leading-6">{product.compatibility.errors[0].message}</p>
                            ) : product.compatibility.warnings[0] ? (
                              <p className="mt-1 text-sm leading-6">{product.compatibility.warnings[0].message}</p>
                            ) : null}
                            {product.compatibility.summary.errorCount + product.compatibility.summary.warningCount > 1 ? (
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
    </section>
  );
}
