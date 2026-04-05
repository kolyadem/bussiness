import type { AppLocale } from "@/lib/constants";
import {
  BUILD_REQUEST_DELIVERY_METHODS,
  isSupportedUkraineCity,
  resolveUkraineCity,
  UKRAINE_CITY_OPTIONS,
} from "@/lib/storefront/build-requests";
import {
  getConfiguratorSlotLabel,
  isConfiguratorSlotKey,
} from "@/lib/storefront/configurator";
import { parseJson } from "@/lib/utils";

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type LegacyOrderStatus = OrderStatus | "IN_PROGRESS";

export const ORDER_DELIVERY_METHODS = BUILD_REQUEST_DELIVERY_METHODS;

export type OrderDeliveryMethod = (typeof ORDER_DELIVERY_METHODS)[number];

export const ORDER_CITY_OPTIONS = UKRAINE_CITY_OPTIONS;

export const ORDER_KINDS = ["PRODUCT", "CONFIGURATOR", "MIXED"] as const;
export type OrderKind = (typeof ORDER_KINDS)[number];

type PcBuildOrderItemConfiguration = {
  type: "pc-build";
  buildSlug: string;
  buildName: string;
  slot: string;
};

export type OrderItemConfiguration = PcBuildOrderItemConfiguration;

export function isOrderStatus(value: string): value is LegacyOrderStatus {
  return value === "IN_PROGRESS" || ORDER_STATUSES.includes(value as OrderStatus);
}

export function isOrderDeliveryMethod(value: string): value is OrderDeliveryMethod {
  return ORDER_DELIVERY_METHODS.includes(value as OrderDeliveryMethod);
}

export function getOrderNumber(id: string) {
  return `ORD-${id.slice(-6).toUpperCase()}`;
}

export function normalizeOrderStatus(value: string | null | undefined): OrderStatus {
  if (value === "IN_PROGRESS") {
    return "PROCESSING";
  }

  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : "NEW";
}

export function getOrderStatusLabel(status: OrderStatus, locale: AppLocale) {
  switch (status) {
    case "NEW":
      return locale === "uk" ? "Нове" : locale === "ru" ? "Новый" : "New";
    case "CONFIRMED":
      return locale === "uk" ? "Підтверджено" : locale === "ru" ? "Подтверждено" : "Confirmed";
    case "PROCESSING":
      return locale === "uk" ? "В обробці" : locale === "ru" ? "В обработке" : "Processing";
    case "SHIPPED":
      return locale === "uk" ? "Відправлено" : locale === "ru" ? "Отправлено" : "Shipped";
    case "COMPLETED":
      return locale === "uk" ? "Завершено" : locale === "ru" ? "Завершено" : "Completed";
    case "CANCELLED":
      return locale === "uk" ? "Скасовано" : locale === "ru" ? "Отменено" : "Cancelled";
  }
}

export function getOrderStatusTone(status: OrderStatus) {
  switch (status) {
    case "NEW":
      return "bg-sky-500/12 text-sky-500 ring-1 ring-sky-500/15";
    case "CONFIRMED":
      return "bg-cyan-500/12 text-cyan-500 ring-1 ring-cyan-500/15";
    case "PROCESSING":
      return "bg-amber-400/12 text-amber-500 ring-1 ring-amber-400/15";
    case "SHIPPED":
      return "bg-violet-500/12 text-violet-500 ring-1 ring-violet-500/15";
    case "COMPLETED":
      return "bg-emerald-500/12 text-emerald-500 ring-1 ring-emerald-500/15";
    case "CANCELLED":
      return "bg-rose-500/12 text-rose-500 ring-1 ring-rose-500/15";
  }
}

export function getOrderDeliveryMethodLabel(method: OrderDeliveryMethod, locale: AppLocale) {
  switch (method) {
    case "NOVA_POSHTA_BRANCH":
      return locale === "uk"
        ? "Нова пошта, відділення"
        : locale === "ru"
          ? "Новая почта, отделение"
          : "Nova Poshta branch";
    case "NOVA_POSHTA_COURIER":
      return locale === "uk"
        ? "Нова пошта, кур'єр"
        : locale === "ru"
          ? "Новая почта, курьер"
          : "Nova Poshta courier";
  }
}

export function normalizeOrderDeliveryCity(value: string) {
  return isSupportedUkraineCity(value) ? resolveUkraineCity(value) : value.trim();
}

export function parseOrderItemConfiguration(
  value: string | null | undefined,
): OrderItemConfiguration | null {
  if (!value) {
    return null;
  }

  const parsed = parseJson<Partial<PcBuildOrderItemConfiguration>>(value, {});

  if (
    parsed.type === "pc-build" &&
    typeof parsed.buildSlug === "string" &&
    typeof parsed.buildName === "string" &&
    typeof parsed.slot === "string"
  ) {
    return {
      type: "pc-build",
      buildSlug: parsed.buildSlug,
      buildName: parsed.buildName,
      slot: parsed.slot,
    };
  }

  return null;
}

export function getOrderItemConfigurationLabel(
  value: string | null | undefined,
  locale: AppLocale,
) {
  const parsed = parseOrderItemConfiguration(value);

  if (!parsed) {
    return null;
  }

  const slotLabel = isConfiguratorSlotKey(parsed.slot)
    ? getConfiguratorSlotLabel(parsed.slot, locale)
    : parsed.slot;

  return locale === "uk"
    ? `Збірка "${parsed.buildName}" • ${slotLabel}`
    : locale === "ru"
      ? `Сборка "${parsed.buildName}" • ${slotLabel}`
      : `Build "${parsed.buildName}" • ${slotLabel}`;
}

export function getOrderKindFromItems(
  items: Array<{ configuration?: string | null }>,
): OrderKind {
  const buildItems = items.filter((item) => parseOrderItemConfiguration(item.configuration ?? null));

  if (buildItems.length === 0) {
    return "PRODUCT";
  }

  if (buildItems.length === items.length) {
    return "CONFIGURATOR";
  }

  return "MIXED";
}

export function getOrderKindLabel(kind: OrderKind, locale: AppLocale) {
  switch (kind) {
    case "PRODUCT":
      return locale === "uk" ? "Товарний" : locale === "ru" ? "Товарный" : "Product";
    case "CONFIGURATOR":
      return locale === "uk" ? "Збірка" : locale === "ru" ? "Сборка" : "Build";
    case "MIXED":
      return locale === "uk" ? "Змішаний" : locale === "ru" ? "Смешанный" : "Mixed";
  }
}

export function getOrderKindTone(kind: OrderKind) {
  switch (kind) {
    case "PRODUCT":
      return "border-[color:var(--color-line)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text-soft)]";
    case "CONFIGURATOR":
      return "border-[color:var(--color-accent-line)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-text)]";
    case "MIXED":
      return "border-amber-400/30 bg-amber-400/10 text-amber-600";
  }
}
