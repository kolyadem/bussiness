"use client";

import { startTransition, useEffect, useState } from "react";
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
import { ConfiguratorOpenTracker } from "@/components/observability/configurator-open-tracker";
import { ComponentsAvailabilityNotice } from "@/components/storefront/components-availability-notice";
import { Button } from "@/components/ui/button";
import { ProductImageFrame } from "@/components/ui/product-image-frame";
import { getActionErrorMessage, readApiPayload } from "@/components/product/client-feedback";
import {
  getCompatibilityAdditionalMessagesLabel,
  getCompatibilityStatusTitle,
  getCompatibilityStatusTone,
} from "@/lib/compatibility/presentation";
import { Link } from "@/lib/i18n/routing";
import type { AppLocale } from "@/lib/constants";
import type { ConfiguratorSlotKey } from "@/lib/storefront/configurator";
import {
  UKRAINE_CITY_OPTIONS,
  getBuildRequestDeliveryMethodLabel,
  type BuildRequestDeliveryMethod,
} from "@/lib/storefront/build-requests";
import { formatPrice, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

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
};

type ConfiguratorSuggestion = {
  slot: ConfiguratorSlotKey;
  title: string;
  body: string;
};

function getCopy(_locale: AppLocale) {
  return {
    title: "Конфігуратор ПК",
    intro: "Збирайте систему поетапно, а фінальні дії залишайте у правому блоці, коли конфігурація буде готова.",
    coreTitle: "Основне",
    extrasTitle: "Додатково",
    choose: "Обрати",
    replace: "Замінити",
    remove: "Прибрати",
    buildName: "Назва збірки",
    buildNamePlaceholder: "Моя збірка ПК",
    save: "Зберегти збірку",
    share: "Поділитися",
    addToCart: "Додати збірку в кошик",
    orderBuild: "Замовити збірку",
    closeRequest: "Сховати форму",
    currentTotal: "Поточна сума",
    openSummary: "Підсумок збірки",
    itemCount: "Позицій",
    summaryTitle: "Ваша збірка",
    summaryEmpty: "Коли додасте перші компоненти, тут з'явиться короткий підсумок.",
    requestTitle: "Заявка на збірку",
    requestHint: "Ми збережемо вашу конфігурацію, контакти й доставку та відправимо заявку менеджеру.",
    fullName: "ПІБ",
    phone: "Номер телефону",
    email: "Email",
    comment: "Коментар",
    city: "Місто доставки",
    deliveryMethod: "Спосіб доставки",
    submitRequest: "Надіслати заявку",
    requestSuccessTitle: "Заявку на збірку відправлено",
    requestSuccessText: "Менеджер уже отримав конфігурацію та контакти. Ви можете зберегти або продовжити доповнювати збірку.",
    requestNumber: "Номер заявки",
    requestAutofill: "Дані з акаунта вже підставлені, за потреби їх можна змінити перед відправкою.",
    emptySlot: "Слот порожній. Оберіть компонент, щоб продовжити збірку.",
    unavailableSlot: "Для цього слота товари ще не додані, але він вже готовий до наступного етапу.",
    shareCopied: "Посилання скопійовано",
    buildSaved: "Збірку оновлено",
    componentRemoved: "Компонент прибрано",
    buildAdded: "Збірку додано в кошик",
    requestCreated: "Заявку створено",
    noImage: "Без фото",
    suggestionTitle: "М’які підказки",
    suggestionAction: "Покращити",
  };
}

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
}: {
  locale: AppLocale;
  build: BuildData | null;
  slots: SlotView[];
  requestPrefill: BuildRequestPrefill;
}) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [buildName, setBuildName] = useState(build?.name ?? "");
  const [pendingAction, setPendingAction] = useState<"save" | "cart" | "request" | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestSuccessNumber, setRequestSuccessNumber] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<BuildRequestPrefill>(requestPrefill);
  const coreSlots = slots.filter((slot) => slot.group === "core");
  const extraSlots = slots.filter((slot) => slot.group === "extras");
  const summaryItems = slots
    .map((slot) => ({
      slot,
      item: build?.itemsBySlot[slot.key] ?? null,
    }))
    .filter((entry) => entry.item);
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
  const conversionSuggestions = build
    ? buildConfiguratorSuggestions(locale, build.itemsBySlot)
    : [];

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
        toast.success(copy.buildSaved);
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
          throw new Error(payload.error || "Could not remove component");
        }

        toast.success(copy.componentRemoved);
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
      toast.success(copy.shareCopied);
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
        toast.success(copy.buildAdded);
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
        toast.success(copy.requestCreated);
        router.refresh();
      } catch (error) {
        const safeMessage =
          error instanceof Error &&
          [
            "Build not found",
            "Build is empty",
            "Too many duplicate requests",
            "Too many build requests. Please try again a bit later.",
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
      ? `/configurator/select?slot=${slot.key}&build=${build.slug}`
      : `/configurator/select?slot=${slot.key}`;

    return (
      <article
        key={slot.key}
        className="rounded-[1.65rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[var(--shadow-soft)]"
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
          <div className="mt-4 grid gap-4 rounded-[1.35rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-3.5 sm:grid-cols-[84px_minmax(0,1fr)]">
            <Link href={`/product/${selected.product.slug}`} className="block">
              <ProductImageFrame
                src={selected.product.heroImage}
                alt={selected.product.name}
                className="rounded-[1rem]"
                fillClassName="p-2.5"
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
                <Link href={pickerHref}>
                  <Button variant="secondary" className="h-9 px-4 text-sm">
                    {copy.replace}
                  </Button>
                </Link>
                <Button variant="ghost" onClick={() => removeSlot(slot.key)} className="h-9 px-3.5 text-sm">
                  <Trash2 className="h-4 w-4" />
                  <span>{copy.remove}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.35rem] border border-dashed border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-4">
            <p className="text-sm leading-6 text-[color:var(--color-text-soft)]">
              {slot.hasChoices ? copy.emptySlot : copy.unavailableSlot}
            </p>
            {slot.hasChoices ? (
              <Link href={pickerHref} className="mt-3 inline-flex">
                <Button className="h-9 px-4 text-sm">{copy.choose}</Button>
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
    <div className="grid gap-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] 2xl:pb-0 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <ConfiguratorOpenTracker locale={locale} buildSlug={build?.slug ?? null} />
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] px-6 py-6 shadow-[var(--shadow-strong)] sm:px-7 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="font-heading text-4xl font-semibold tracking-[-0.05em] text-[color:var(--color-text)] sm:text-[3.1rem]">
              {copy.title}
            </h1>
            {copy.intro ? (
              <p className="mt-3 text-sm leading-7 text-[color:var(--color-text-soft)] sm:text-base">
                {copy.intro}
              </p>
            ) : null}
          </div>
        </section>

        <ComponentsAvailabilityNotice />

        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[linear-gradient(180deg,var(--color-surface)_0%,var(--color-gradient-surface)_100%)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
              {copy.coreTitle}
            </h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">{coreSlots.map(renderSlot)}</div>
        </section>

        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
              {copy.extrasTitle}
            </h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">{extraSlots.map(renderSlot)}</div>
        </section>
      </div>

      <aside
        id="configurator-build-summary"
        className="scroll-mt-[calc(var(--header-offset)+0.75rem)] self-start 2xl:sticky 2xl:top-[calc(var(--header-offset)+0.75rem)] 2xl:h-fit"
      >
        <section className="rounded-[2rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-gradient-surface)] p-5 shadow-[var(--shadow-strong)]">
          <div className="space-y-2">
            <h2 className="font-heading text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-text)]">
              {copy.summaryTitle}
            </h2>
          </div>

          <div className="mt-5 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-4">
            <label className="grid gap-2 text-sm text-[color:var(--color-text-soft)]">
              <span>{copy.buildName}</span>
              <input
                value={buildName}
                onChange={(event) => setBuildName(event.target.value)}
                placeholder={copy.buildNamePlaceholder}
                className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
              />
            </label>
          </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-2">
            <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-4">
              <p className="text-sm text-[color:var(--color-text-soft)]">{copy.currentTotal}</p>
              <p className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
                {formatPrice(build?.totalPrice ?? 0, locale, summaryItems[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE)}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-4">
              <p className="text-sm text-[color:var(--color-text-soft)]">{copy.itemCount}</p>
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
                  <p className="hidden font-medium">
                    {compatibilityStatus === "pass"
                      ? "Збірка сумісна"
                      : compatibilityStatus === "warning"
                        ? "Є попередження щодо сумісності"
                        : "Збірка несумісна"}
                  </p>
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
              <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.suggestionTitle}</p>
              <div className="mt-3 grid gap-3">
                {conversionSuggestions.map((suggestion) => (
                  <div
                    key={`${suggestion.slot}-${suggestion.title}`}
                    className="rounded-[1.1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3"
                  >
                    <p className="text-sm font-medium text-[color:var(--color-text)]">{suggestion.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-soft)]">{suggestion.body}</p>
                    <Link
                      href={`/configurator/select?slot=${suggestion.slot}${build?.slug ? `&build=${build.slug}` : ""}`}
                      className="mt-3 inline-flex text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-accent-strong)]"
                    >
                      {copy.suggestionAction}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-[1.4rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] p-4">
            {summaryItems.length > 0 ? (
              <div className="grid gap-3">
                {summaryItems.map(({ slot, item }) =>
                  item ? (
                    <div key={slot.key} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
                          {slot.label}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-6 text-[color:var(--color-text)]">
                          {item.product.name}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm text-[color:var(--color-text-soft)]">
                        {formatPrice(item.product.price, locale, item.product.currency)}
                      </p>
                    </div>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[color:var(--color-text-soft)]">{copy.summaryEmpty}</p>
            )}
          </div>

          {requestSuccessNumber ? (
            <div className="mt-4 rounded-[1.4rem] border border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[color:var(--color-accent-strong)]" />
                <div>
                  <p className="font-medium text-[color:var(--color-text)]">{copy.requestSuccessTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">
                    {copy.requestSuccessText}
                  </p>
                  <p className="mt-3 text-sm font-medium text-[color:var(--color-text)]">
                    {copy.requestNumber}: {requestSuccessNumber}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3">
            <Button onClick={save} disabled={!build?.slug || pendingAction !== null || summaryItems.length === 0} variant="secondary">
              {pendingAction === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              <span>{copy.save}</span>
            </Button>
            <Button variant="secondary" onClick={copyShareLink} disabled={!build?.shareToken}>
              <Copy className="h-4 w-4" />
              <span>{copy.share}</span>
            </Button>
            <Button
              variant="secondary"
              onClick={addBuildToCart}
              disabled={!build?.slug || summaryItems.length === 0 || pendingAction !== null || blockingCompatibility}
            >
              {pendingAction === "cart" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              <span>{copy.addToCart}</span>
            </Button>
            <Button
              onClick={() => setRequestOpen((current) => !current)}
              disabled={!build?.slug || summaryItems.length === 0 || pendingAction !== null || blockingCompatibility}
            >
              {copy.orderBuild}
            </Button>
          </div>

          {requestOpen ? (
            <div className="mt-5 rounded-[1.5rem] border border-[color:var(--color-line-strong)] bg-[color:var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--color-text)]">{copy.requestTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-text-soft)]">{copy.requestHint}</p>
                </div>
                <Button variant="ghost" className="h-8 px-3 text-xs" onClick={() => setRequestOpen(false)}>
                  {copy.closeRequest}
                </Button>
              </div>

              {(requestPrefill.fullName || requestPrefill.phone || requestPrefill.email) && (
                <div className="mt-4 rounded-[1.2rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm leading-6 text-[color:var(--color-text-soft)]">
                  {copy.requestAutofill}
                </div>
              )}

              <div className="mt-4 grid gap-3">
                <input
                  value={requestForm.fullName}
                  onChange={(event) => setRequestForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder={copy.fullName}
                  className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={requestForm.phone}
                    onChange={(event) => setRequestForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder={copy.phone}
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  />
                  <input
                    value={requestForm.email}
                    onChange={(event) => setRequestForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder={copy.email}
                    className="h-11 rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                  />
                </div>

                <div className="rounded-[1.25rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] p-3.5">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-[color:var(--color-text)]">{copy.deliveryMethod}</p>
                  </div>

                  <div className="grid gap-3">
                    <input
                      list="ukraine-cities"
                      value={requestForm.deliveryCity}
                      onChange={(event) =>
                        setRequestForm((current) => ({ ...current, deliveryCity: event.target.value }))
                      }
                      placeholder={copy.city}
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
                              setRequestForm((current) => ({ ...current, deliveryMethod: method }))
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
                  </div>
                </div>

                <textarea
                  value={requestForm.comment}
                  onChange={(event) => setRequestForm((current) => ({ ...current, comment: event.target.value }))}
                  placeholder={copy.comment}
                  rows={4}
                  className="rounded-[1rem] border border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] px-4 py-3 text-sm text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--color-accent-line)]"
                />

                <Button
                  onClick={submitBuildRequest}
                  disabled={!build?.slug || summaryItems.length === 0 || pendingAction !== null}
                >
                  {pendingAction === "request" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  <span>{copy.submitRequest}</span>
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
        aria-label={copy.openSummary}
        className="flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-[color:var(--color-line)] bg-[color:var(--color-overlay-soft)] px-4 py-2.5 text-left transition active:scale-[0.99]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-[color:var(--color-text-soft)]">
            {copy.currentTotal}
          </p>
          <p className="mt-0.5 truncate font-heading text-xl font-semibold tracking-[-0.04em] text-[color:var(--color-text)]">
            {formatPrice(build?.totalPrice ?? 0, locale, summaryItems[0]?.item?.product.currency ?? STOREFRONT_CURRENCY_CODE)}
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--color-text-soft)]">
            {copy.itemCount}: <span className="font-medium text-[color:var(--color-text)]">{build?.itemCount ?? 0}</span>
          </p>
        </div>
        <ChevronUp className="h-5 w-5 shrink-0 text-[color:var(--color-text-soft)]" aria-hidden />
      </button>
    </div>
    </>
  );
}
