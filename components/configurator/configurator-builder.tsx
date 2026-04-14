"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  Copy,
  LoaderCircle,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { ConfiguratorOpenTracker } from "@/components/observability/configurator-open-tracker";
import { ComponentsAvailabilityNotice } from "@/components/storefront/components-availability-notice";
import { Button } from "@/components/ui/button";
import { ConfiguratorSlotProductPreview } from "@/components/configurator/configurator-slot-product-preview";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";
import {
  getCompatibilityAdditionalMessagesLabel,
  getCompatibilityStatusTitle,
  getCompatibilityStatusTone,
} from "@/lib/compatibility/presentation";
import { ConfiguratorAddSlotToCartButton } from "@/components/configurator/configurator-add-slot-to-cart";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import {
  computePcAssemblyServiceFeeUah,
  resolveAssemblyFeeSettings,
} from "@/lib/storefront/pc-assembly-fee";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";
import {
  UKRAINE_CITY_OPTIONS,
  getBuildRequestDeliveryMethodLabel,
  type BuildRequestDeliveryMethod,
} from "@/lib/storefront/build-requests";
import { formatPrice, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";
import { resolveHeroImageSrc } from "@/lib/storefront/product-image";

function trackAnalytics(payload: Record<string, unknown>) {
  void fetch("/api/analytics", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}

type ProductPreview = {
  id: string;
  slug: string;
  name: string;
  heroImage: string;
  shortDescription: string;
  price: number;
  currency: string;
  category: { slug: string; name: string };
  technicalAttributes: Record<string, string | number | string[]>;
};

type BuildData = {
  id: string;
  slug: string;
  name: string;
  shareToken: string;
  shareHref: string;
  totalPrice: number;
  itemCount: number;
  compatibility: {
    status: "pass" | "warning" | "fail";
    errors: Array<{ message: string }>;
    warnings: Array<{ message: string }>;
    summary: {
      errorCount: number;
      warningCount: number;
      passedCount: number;
    };
  };
  itemsBySlot: Record<
    ConfiguratorSlotKey,
    | null
    | {
        id: string;
        slot: ConfiguratorSlotKey;
        quantity: number;
        product: ProductPreview;
      }
  >;
};

type SlotView = {
  key: ConfiguratorSlotKey;
  group: "core" | "extras";
  label: string;
  description: string;
  hasChoices: boolean;
};

type BuildRequestPrefill = {
  fullName: string;
  phone: string;
  email: string;
  comment: string;
  deliveryCity: string;
  deliveryMethod: BuildRequestDeliveryMethod;
  deliveryBranch: string;
  telegramUsername: string;
  promoCode: string;
};

type ConfiguratorSuggestion = {
  slot: ConfiguratorSlotKey;
  title: string;
  body: string;
};

function getNumericAttribute(product: ProductPreview | null | undefined, key: string) {
  const raw = product?.technicalAttributes?.[key];

  if (raw === null || raw === undefined) {
    return null;
  }

  const normalized = Number(String(Array.isArray(raw) ? raw[0] ?? "" : raw).replace(/[^\d.-]/g, ""));
  return Number.isFinite(normalized) ? normalized : null;
}

function buildConfiguratorSuggestions(
  _locale: AppLocale,
  itemsBySlot: BuildData["itemsBySlot"],
): ConfiguratorSuggestion[] {
  const cpu = itemsBySlot.cpu?.product ?? null;
  const ram = itemsBySlot.ram?.product ?? null;
  const gpu = itemsBySlot.gpu?.product ?? null;
  const psu = itemsBySlot.psu?.product ?? null;
  const storage = itemsBySlot.storage?.product ?? null;
  const cooling = itemsBySlot.cooling?.product ?? null;
  const suggestions: ConfiguratorSuggestion[] = [];

  const cpuTdp = getNumericAttribute(cpu, "cpu.tdp") ?? getNumericAttribute(cpu, "tdp");
  const gpuTdp =
    getNumericAttribute(gpu, "gpu.tdp") ??
    getNumericAttribute(gpu, "gpu.wattage") ??
    getNumericAttribute(gpu, "wattage");
  const psuWattage =
    getNumericAttribute(psu, "psu.wattage") ?? getNumericAttribute(psu, "wattage");
  const ramCapacity =
    getNumericAttribute(ram, "ram.capacity_gb") ??
    getNumericAttribute(ram, "memory.capacity_gb") ??
    getNumericAttribute(ram, "memoryCapacityGb");

  if ((cpu || gpu) && !psu) {
    suggestions.push({
      slot: "psu",
      title: "Додайте блок живлення із запасом",
      body:
        "Коли CPU або GPU вже вибрані, хороший PSU найчастіше дає системі правильний запас стабільності.",
    });
  }

  if (psuWattage && cpuTdp && gpuTdp && psuWattage < (cpuTdp + gpuTdp) * 1.6) {
    suggestions.push({
      slot: "psu",
      title: "БЖ майже без запасу",
      body:
        "Можна глянути на потужніший блок живлення, щоб залишився спокійний запас під пікові навантаження.",
    });
  }

  if (cpu && !cooling) {
    suggestions.push({
      slot: "cooling",
      title: "Охолодження зробить збірку спокійнішою",
      body:
        "Навіть базове охолодження часто дає тихішу роботу і кращий температурний режим.",
    });
  }

  if (ramCapacity !== null && ramCapacity < 32) {
    suggestions.push({
      slot: "ram",
      title: "RAM можна підсилити до 32 ГБ",
      body:
        "Для сучасних ігор, браузера і робочих задач 32 ГБ зазвичай відчуваються помітно спокійніше.",
    });
  }

  if ((cpu || gpu) && !storage) {
    suggestions.push({
      slot: "storage",
      title: "Не забудьте про швидкий SSD",
      body:
        "Навіть один швидкий SSD робить готову збірку значно завершенішою вже на старті.",
    });
  }

  return suggestions.slice(0, 2);
}

export function ConfiguratorBuilder({
  locale,
  build,
  slots,
  requestPrefill,
  cartItemCount = 0,
  assemblyBaseFeeUah = 0,
  assemblyPercent = 0,
}: {
  locale: AppLocale;
  build: BuildData | null;
  slots: SlotView[];
  requestPrefill: BuildRequestPrefill;
  cartItemCount?: number;
  /** Параметри формули збірки з SiteSettings — для орієнтовного підсумку */
  assemblyBaseFeeUah?: number;
  assemblyPercent?: number;
}) {
  const router = useRouter();
  const t = useTranslations();
  const [buildName, setBuildName] = useState(build?.name ?? "");
  const [pendingAction, setPendingAction] = useState<"save" | "cart" | "request" | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSuccessNumber, setRequestSuccessNumber] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<BuildRequestPrefill>(requestPrefill);
  const [wantsAssembly, setWantsAssembly] = useState(true);
  const coreSlots = slots.filter((slot) => slot.group === "core");
  const extraSlots = slots.filter((slot) => slot.group === "extras");
  const summaryItems = slots
    .map((slot) => ({
      slot,
      item: build?.itemsBySlot[slot.key] ?? null,
    }))
    .filter((entry) => entry.item);
  const assemblyFeeUah = useMemo(
    () =>
      computePcAssemblyServiceFeeUah({
        componentsSubtotal: build?.totalPrice ?? 0,
        hasPcBuild: summaryItems.length > 0 && wantsAssembly,
        ...resolveAssemblyFeeSettings({ assemblyBaseFeeUah, assemblyPercent }),
      }),
    [assemblyBaseFeeUah, assemblyPercent, build?.totalPrice, summaryItems.length, wantsAssembly],
  );
  const hasAssemblySettings = assemblyBaseFeeUah > 0 || assemblyPercent > 0;
  const deliveryMethods: BuildRequestDeliveryMethod[] = [
    "NOVA_POSHTA_BRANCH",
    "NOVA_POSHTA_COURIER",
  ];
  const compatibilityStatus = build?.compatibility.status ?? "pass";
  const blockingCompatibility = compatibilityStatus === "fail";
  const compatibilityMessageCount =
    (build?.compatibility.errors.length ?? 0) + (build?.compatibility.warnings.length ?? 0);
  const firstCompatibilityMessage =
    build?.compatibility.errors[0]?.message ?? build?.compatibility.warnings[0]?.message ?? null;
  const conversionSuggestions = useMemo(
    () => (build ? buildConfiguratorSuggestions(locale, build.itemsBySlot) : []),
    [build, locale],
  );

  useEffect(() => {
    setBuildName(build?.name ?? "");
  }, [build?.name]);

  useEffect(() => {
    setRequestForm(requestPrefill);
  }, [requestPrefill]);

  const refreshToBuild = (slug: string) => {
    router.push(`/configurator?build=${slug}`);
    router.refresh();
  };

  const save = () => {
    if (!build?.slug) {
      return;
    }

    setPendingAction("save");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/configurator/builds/${build.slug}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            name: buildName,
          }),
        });

        if (!response.ok) {
          const payload = await readApiPayload(response);
          throw new Error(payload.error || "Не вдалося зберегти збірку");
        }

        const payload = (await response.json()) as { build?: { slug: string } };
        const nextSlug = payload.build?.slug ?? build.slug;
        toast.success(t("configuratorBuildSaved"));
        refreshToBuild(nextSlug);
      } catch {
        toast.error(getActionErrorMessage(locale));
      } finally {
        setPendingAction(null);
      }
    });
  };

  const removeSlot = (slot: ConfiguratorSlotKey) => {
    if (!build?.slug) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/configurator/builds/${build.slug}/items`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            slot,
          }),
        });

        if (!response.ok) {
          const payload = await readApiPayload(response);
          throw new Error(payload.error || "Не вдалося прибрати компонент");
        }

        toast.success(t("configuratorComponentRemoved"));
        router.refresh();
      } catch {
        toast.error(getActionErrorMessage(locale));
      }
    });
  };

  const copyShareLink = async () => {
    if (!build?.shareHref) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${build.shareHref}`);
      toast.success(t("configuratorShareCopied"));
    } catch {
      toast.error(getActionErrorMessage(locale));
    }
  };

  const addBuildToCart = () => {
    if (!build?.slug) {
      return;
    }

    setPendingAction("cart");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/configurator/builds/${build.slug}/cart`, {
          method: "POST",
        });

        if (!response.ok) {
          const payload = await readApiPayload(response);
          throw new Error(payload.error || "Не вдалося додати збірку в кошик");
        }

        trackAnalytics({
          event: "add_to_cart",
          pathname: `/configurator`,
          locale,
          details: {
            buildSlug: build.slug,
            source: "configurator",
            itemCount: build.itemCount,
          },
        });
        toast.success(t("configuratorBuildAdded"));
        router.refresh();
      } catch {
        toast.error(getActionErrorMessage(locale));
      } finally {
        setPendingAction(null);
      }
    });
  };

  const submitBuildRequest = () => {
    if (!build?.slug || summaryItems.length === 0) {
      return;
    }

    setPendingAction("request");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/configurator/builds/${build.slug}/requests`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            locale,
            fullName: requestForm.fullName,
            phone: requestForm.phone,
            email: requestForm.email,
            comment: requestForm.comment,
            deliveryCity: requestForm.deliveryCity,
            deliveryMethod: requestForm.deliveryMethod,
            deliveryBranch: requestForm.deliveryBranch,
            telegramUsername: requestForm.telegramUsername,
            promoCode: requestForm.promoCode,
          }),
        });

        if (!response.ok) {
          const payload = await readApiPayload(response);
          throw new Error(payload.error || "Не вдалося створити заявку на збірку");
        }

        const payload = (await response.json()) as {
          request?: {
            number: string;
          };
        };
        setRequestSuccessNumber(payload.request?.number ?? null);
        setRequestOpen(false);
        toast.success(t("configuratorRequestCreated"));
        router.refresh();
      } catch (error) {
        const safeMessage =
          error instanceof Error &&
          [
            "Збірку не знайдено",
            "Збірка порожня",
            "Забагато схожих заявок за короткий час",
            "Забагато заявок за короткий час. Спробуйте пізніше.",
          ].includes(error.message)
            ? error.message
            : getActionErrorMessage(locale);
        toast.error(safeMessage);
      } finally {
        setPendingAction(null);
      }
    });
  };

  const renderSlot = (slot: SlotView) => {
    const selected = build?.itemsBySlot[slot.key] ?? null;
    const pickerHref = build?.slug
      ? `/configurator?build=${build.slug}&pick=${slot.key}`
      : `/configurator/select?slot=${slot.key}`;

    return (
      <article
        key={slot.key}
        className={[
          "rounded-[1.65rem] border bg-[color:var(--color-surface)] px-4 py-4 shadow-[var(--shadow-soft)] transition",
          selected
            ? "border-[color:var(--color-accent-line)] ring-1 ring-[color:var(--color-accent-line)]/35"
            : "border-[color:var(--color-line-strong)]",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--color-text)] sm:text-[1.18rem]">
              {slot.label}
            </h3>
          </div>
          {selected ? (
            <p className="whitespace-nowrap text-sm font-medium text-[color:var(--color-text)]">
              {formatPrice(selected.product.price, locale, selected.product.currency)}
            </p>
          ) : null}
        </div>

        {selected ? (
          <div className="mt-4 grid gap-4 rounded-[1.35rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-3.5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start">
            <Link href={`/product/${selected.product.slug}`} className="block w-full min-w-0">
              <ConfiguratorSlotProductPreview
                heroImage={selected.product.heroImage}
                name={selected.product.name}
              />
            </Link>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-text-soft)]">
                  {selected.product.category.name}
                </p>
                <Link
                  href={`/product/${selected.product.slug}`}
                  className="mt-1 line-clamp-2 text-base font-semibold leading-6 text-[color:var(--color-text)] transition hover:text-[color:var(--color-accent-strong)]"
                >
                  {selected.product.name}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[color:var(--color-text-soft)]">
                  {selected.product.shortDescription}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {build?.slug ? (
                  <ConfiguratorAddSlotToCartButton
                    locale={locale}
                    buildSlug={build.slug}
                    slot={slot.key}
                    productId={selected.product.id}
                    label={t("configuratorAddSlotToCart")}
                    disabled={blockingCompatibility}
                  />
                ) : null}
                <Link href={pickerHref}>
                  <Button variant="secondary" className="h-9 px-4 text-sm">
                    {t("configuratorReplace")}
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => removeSlot(slot.key)} className="h-9 px-3.5 text-sm">
                  <Trash2 className="h-4 w-4" />
                  <span>{t("configuratorRemove")}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.35rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
            <p className="text-sm leading-6 text-[color:var(--color-text-soft)]">
              {slot.hasChoices ? t("configuratorEmptySlot") : t("configuratorUnavailableSlot")}
            </p>
            {slot.hasChoices ? (
              <Link href={pickerHref} className="mt-3 inline-flex">
                <Button className="h-9 px-4 text-sm">{t("configuratorChoose")}</Button>
              </Link>
            ) : null}
          </div>
        )}
      </article>
    );
  };

  const scrollToBuildSummary = () => {
    document.getElementById("configurator-build-summary")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <>
    <div className="grid gap-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))] 2xl:pb-0 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <ConfiguratorOpenTracker locale={locale} buildSlug={build?.slug ?? null} />
      <div className="space-y-5">
        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] px-5 py-5 shadow-[var(--shadow-strong)] sm:px-6 sm:py-6 lg:px-7">
          <div className="max-w-4xl">
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-[2.95rem]">
              {t("configuratorTitle")}
            </h1>
            {t("configuratorIntro") ? (
              <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
                {t("configuratorIntro")}
              </p>
            ) : null}
          </div>
        </section>

        <ComponentsAvailabilityNotice />

        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[linear-gradient(180deg,var(--color-surface)_0%,var(--color-gradient-surface)_100%)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
              {t("configuratorCoreTitle")}
            </h2>
          </div>
          <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">{coreSlots.map(renderSlot)}</div>
        </section>

        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
              {t("configuratorExtrasTitle")}
            </h2>
          </div>
          <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">{extraSlots.map(renderSlot)}</div>
        </section>
      </div>

      <aside
        id="configurator-build-summary"
        className="scroll-mt-[calc(var(--header-offset)+0.75rem)] self-start 2xl:sticky 2xl:top-[calc(var(--header-offset)+0.75rem)] 2xl:h-fit"
      >
        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-4 shadow-[var(--shadow-strong)] sm:p-5">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {t("configuratorSummaryTitle")}
            </h2>
          </div>

          <div className="mt-5 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-4">
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{t("configuratorBuildName")}</span>
              <input
                value={buildName}
                onChange={(event) => setBuildName(event.target.value)}
                placeholder={t("configuratorBuildNamePlaceholder")}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
              />
            </label>
          </div>

            {summaryItems.length > 0 && hasAssemblySettings ? (
            <div className="mt-4 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={wantsAssembly}
                  onChange={(event) => setWantsAssembly(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[color:var(--color-accent-strong)]"
                />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-[color:var(--color-text)]">Збірка ПК</span>
                  <p className="mt-0.5 text-xs leading-5 text-[color:var(--color-text-soft)]">
                    {assemblyPercent > 0 && assemblyBaseFeeUah > 0
                      ? `База + ${assemblyPercent}% від суми комплектуючих`
                      : assemblyPercent > 0
                        ? `${assemblyPercent}% від суми комплектуючих`
                        : "Фіксована вартість монтажу"}
                  </p>
                </div>
              </label>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-4">
              <p className="text-sm text-[color:var(--color-text-soft)]">{t("configuratorCurrentTotal")}</p>
              <p className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {formatPrice(build?.totalPrice ?? 0, locale, summaryItems[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE)}
              </p>
              {assemblyFeeUah > 0 ? (
                <div className="mt-3 space-y-1 border-t border-[color:var(--color-line)] pt-3 text-sm text-[color:var(--color-text-soft)]">
                  <div className="flex items-center justify-between gap-2">
                    <span>Збірка ПК</span>
                    <span className="font-medium text-[color:var(--color-text)]">
                      {formatPrice(
                        assemblyFeeUah,
                        locale,
                        summaryItems[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE,
                      )}
                    </span>
                  </div>
                  <p className="text-xs leading-5">
                    Орієнтовно зі збіркою:{" "}
                    <span className="font-medium text-[color:var(--color-text)]">
                      {formatPrice(
                        (build?.totalPrice ?? 0) + assemblyFeeUah,
                        locale,
                        summaryItems[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE,
                      )}
                    </span>
                    . Промокод вказується в заявці нижче.
                  </p>
                </div>
              ) : null}
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-4">
              <p className="text-sm text-[color:var(--color-text-soft)]">{t("configuratorItemCount")}</p>
              <p className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {build?.itemCount ?? 0}
              </p>
            </div>
            </div>

            <div
              className={[
                "mt-4 rounded-[1.4rem] border px-4 py-4",
                getCompatibilityStatusTone(compatibilityStatus),
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                {compatibilityStatus === "pass" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                ) : compatibilityStatus === "warning" ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div>
                  <p className="font-medium">{getCompatibilityStatusTitle(compatibilityStatus, locale)}</p>
                  {firstCompatibilityMessage ? (
                    <p className="mt-2 text-sm leading-6">{firstCompatibilityMessage}</p>
                  ) : null}
                  {compatibilityMessageCount > 1 ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-current/75">
                      {getCompatibilityAdditionalMessagesLabel(
                        compatibilityMessageCount - 1,
                        locale,
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

          {conversionSuggestions.length > 0 ? (
            <div className="mt-4 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-4">
              <p className="text-sm font-medium text-[color:var(--color-text)]">{t("configuratorSuggestionTitle")}</p>
              <div className="mt-3 grid gap-3">
                {conversionSuggestions.map((suggestion) => (
                  <div
                    key={`${suggestion.slot}-${suggestion.title}`}
                    className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[color:var(--color-text)]">{suggestion.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-soft)]">{suggestion.body}</p>
                    <Link
                      href={
                        build?.slug
                          ? `/configurator?build=${build.slug}&pick=${suggestion.slot}`
                          : `/configurator/select?slot=${suggestion.slot}`
                      }
                      className="mt-3 inline-flex text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent-strong)]"
                    >
                      {t("configuratorSuggestionAction")}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-4">
            {summaryItems.length > 0 ? (
              <div className="grid gap-3">
                {summaryItems.map(({ slot, item }) => {
                  if (!item) {
                    return null;
                  }

                  const thumbSrc = resolveHeroImageSrc(item.product.heroImage);

                  return (
                    <div
                      key={slot.key}
                      className="flex flex-col gap-2 rounded-[1.15rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)]/90 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="flex min-w-0 flex-1 gap-3 sm:items-center">
                        <Link
                          href={`/product/${item.product.slug}`}
                          className="relative h-[3.75rem] w-[4.75rem] shrink-0 overflow-hidden rounded-[0.85rem] border border-[color:var(--color-line)] bg-[color:var(--color-gradient-surface)]"
                        >
                          <Image
                            src={thumbSrc}
                            alt=""
                            fill
                            sizes="76px"
                            className="object-contain p-1.5"
                            unoptimized={thumbSrc.toLowerCase().endsWith(".svg")}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
                            {slot.label}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-[color:var(--color-text)]">
                            {item.product.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <p className="whitespace-nowrap text-sm font-medium text-[color:var(--color-text)]">
                          {formatPrice(item.product.price, locale, item.product.currency)}
                        </p>
                        {build?.slug ? (
                          <ConfiguratorAddSlotToCartButton
                            locale={locale}
                            buildSlug={build.slug}
                            slot={slot.key}
                            productId={item.product.id}
                            label={t("configuratorAddSlotToCart")}
                            disabled={blockingCompatibility}
                            compact
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--color-text-soft)]">{t("configuratorSummaryEmpty")}</p>
            )}
          </div>

          {requestSuccessNumber ? (
            <div className="mt-4 rounded-[1.4rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[color:var(--color-accent-strong)]" />
                <div>
                  <p className="font-medium text-[color:var(--color-text)]">{t("configuratorRequestSuccessTitle")}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">
                    {t("configuratorRequestSuccessText")}
                  </p>
                  <p className="mt-3 text-sm font-medium text-[color:var(--color-text)]">
                    {t("configuratorRequestNumber")}: {requestSuccessNumber}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            <Button onClick={save} disabled={!build?.slug || pendingAction !== null || summaryItems.length === 0} variant="secondary">
              {pendingAction === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              <span>{t("configuratorSave")}</span>
            </Button>
            <Button variant="secondary" onClick={copyShareLink} disabled={!build?.shareToken}>
              <Copy className="h-4 w-4" />
              <span>{t("configuratorShare")}</span>
            </Button>
            <Button
              variant="secondary"
              onClick={addBuildToCart}
              disabled={!build?.slug || summaryItems.length === 0 || pendingAction !== null || blockingCompatibility}
            >
              {pendingAction === "cart" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              <span>{t("configuratorAddAllToCart")}</span>
            </Button>
            {cartItemCount > 0 ? (
              <Link
                href="/checkout"
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface-elevated)] px-5 text-sm font-medium text-[color:var(--color-text)] shadow-[var(--shadow-soft)] outline-none transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[color:var(--color-accent-line)] hover:bg-[color:var(--color-surface-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent-line)]"
              >
                {t("configuratorGoCheckout")}
              </Link>
            ) : (
              <>
                <Button variant="secondary" type="button" disabled>
                  {t("configuratorGoCheckout")}
                </Button>
                <p className="text-xs leading-5 text-[color:var(--color-text-soft)]">{t("configuratorCheckoutHint")}</p>
              </>
            )}
            <Button
              onClick={() => setRequestOpen((current) => !current)}
              disabled={!build?.slug || summaryItems.length === 0 || pendingAction !== null || blockingCompatibility}
            >
              {t("configuratorLeaveRequest")}
            </Button>
          </div>

          {requestOpen ? (
            <div className="mt-5 rounded-[1.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{t("configuratorRequestTitle")}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{t("configuratorRequestHint")}</p>
                </div>
                <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setRequestOpen(false)}>
                  {t("configuratorCloseRequest")}
                </Button>
              </div>

              {(requestPrefill.fullName || requestPrefill.phone || requestPrefill.email) && (
                <div className="mt-4 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm leading-6 text-[color:var(--color-text-soft)]">
                  {t("configuratorRequestAutofill")}
                </div>
              )}

              <div className="mt-4 grid gap-3">
                <input
                  value={requestForm.fullName}
                  onChange={(event) => setRequestForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder={t("configuratorFullName")}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={requestForm.phone}
                    onChange={(event) => setRequestForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={t("configuratorPhone")}
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  />
                  <input
                    value={requestForm.email}
                    onChange={(event) => setRequestForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={t("configuratorEmail")}
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  />
                </div>

                <label className="grid gap-2">
                  <span className="text-sm text-[color:var(--color-text-soft)]">{t("configuratorTelegram")}</span>
                  <input
                    value={requestForm.telegramUsername}
                    onChange={(event) =>
                      setRequestForm((current) => ({ ...current, telegramUsername: event.target.value }))
                    }
                    placeholder="@username"
                    autoComplete="off"
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  />
                  <span className="text-xs leading-5 text-[color:var(--color-text-soft)]">{t("configuratorTelegramHint")}</span>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-[color:var(--color-text-soft)]">Промокод</span>
                  <input
                    value={requestForm.promoCode}
                    onChange={(event) =>
                      setRequestForm((current) => ({ ...current, promoCode: event.target.value }))
                    }
                    placeholder="Необов'язково"
                    autoComplete="off"
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  />
                  <span className="text-xs leading-5 text-[color:var(--color-text-soft)]">
                    Якщо є діючий промокод, вкажіть його тут — знижка застосується після перевірки на сервері.
                  </span>
                </label>

                <div className="rounded-[1.25rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-3.5">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-[color:var(--color-text)]">{t("configuratorDeliveryMethod")}</p>
                  </div>

                  <div className="grid gap-3">
                    <input
                      list="ukraine-cities"
                      value={requestForm.deliveryCity}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, deliveryCity: event.target.value }))
                      }
                      placeholder={t("configuratorCity")}
                      className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                    />
                    <datalist id="ukraine-cities">
                      {UKRAINE_CITY_OPTIONS.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>

                    <div className="grid gap-2">
                      {deliveryMethods.map((method) => {
                        const active = requestForm.deliveryMethod === method;

                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() =>
                              setRequestForm((current) => ({
                                ...current,
                                deliveryMethod: method,
                                deliveryBranch:
                                  method === "NOVA_POSHTA_BRANCH" ? current.deliveryBranch : "",
                              }))
                            }
                            className={[
                              "flex items-center justify-between rounded-[1rem] border px-4 py-3 text-left transition",
                              active
                                ? "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)]"
                                : "border-[color:var(--color-line)] bg-[color:var(--color-surface)] hover:border-[color:var(--color-line-strong)]",
                            ].join(" ")}
                          >
                            <span className="text-sm font-medium text-[color:var(--color-text)]">
                              {getBuildRequestDeliveryMethodLabel(method, locale)}
                            </span>
                            <span
                              className={[
                                "h-2.5 w-2.5 rounded-full transition",
                                active ? "bg-[color:var(--color-accent-strong)]" : "bg-[color:var(--color-line-strong)]",
                              ].join(" ")}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {requestForm.deliveryMethod === "NOVA_POSHTA_BRANCH" ? (
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[color:var(--color-text)]">{t("configuratorBranch")}</span>
                        <input
                          value={requestForm.deliveryBranch}
                          onChange={(event) =>
                            setRequestForm((current) => ({ ...current, deliveryBranch: event.target.value }))
                          }
                          placeholder={t("configuratorBranchPlaceholder")}
                          inputMode="numeric"
                          className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                        />
                      </label>
                    ) : null}
                  </div>
                </div>

                <textarea
                  value={requestForm.comment}
                  onChange={(event) => setRequestForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder={t("configuratorComment")}
                  rows={4}
                  className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                />

                <Button
                  onClick={submitBuildRequest}
                  disabled={!build?.slug || summaryItems.length === 0 || pendingAction !== null}
                >
                  {pendingAction === "request" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  <span>{t("configuratorSubmitRequest")}</span>
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </aside>
    </div>

    <div
      className="fixed inset-x-0 bottom-0 z-[60] 2xl:hidden border-t border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)]/95 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md supports-[backdrop-filter]:bg-[color:var(--color-surface)]/80"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={scrollToBuildSummary}
        aria-label={t("configuratorOpenSummary")}
        className="flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-2.5 text-left transition active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
            {t("configuratorCurrentTotal")}
          </p>
          <p className="mt-0.5 truncate font-heading text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
            {formatPrice(build?.totalPrice ?? 0, locale, summaryItems[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE)}
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--color-text-soft)]">
            {t("configuratorItemCount")}: <span className="font-medium text-[color:var(--color-text)]">{build?.itemCount ?? 0}</span>
          </p>
        </div>
        <ChevronUp className="h-5 w-5 shrink-0 text-[color:var(--color-text-soft)]" aria-hidden />
      </button>
    </div>
    </>
  );
}
