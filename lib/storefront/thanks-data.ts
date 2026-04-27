import { db } from "@/lib/db";
import type { AppLocale } from "@/lib/constants";
import { parseBuildRequestItemsSnapshot } from "@/lib/storefront/build-requests";
import { getOrderItemConfigurationLabel, parseOrderItemConfiguration } from "@/lib/storefront/orders";
import { formatPriceOrPlaceholder, STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

export const THANKS_PAGE_TYPES = [
  "build-request",
  "order",
  "configurator-order",
] as const;

export type ThanksPageType = (typeof THANKS_PAGE_TYPES)[number];

type DetailRow = {
  label: string;
  value: string;
};

type SummaryItem = {
  title: string;
  subtitle?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type ThanksPageData = {
  type: ThanksPageType;
  heading: string;
  message: string;
  customerDetails: DetailRow[];
  summaryTitle: string;
  summaryDetails: DetailRow[];
  summaryItems: SummaryItem[];
  flowCta: {
    href: string;
    label: string;
  } | null;
};

function isThanksPageType(value: string | undefined): value is ThanksPageType {
  return THANKS_PAGE_TYPES.includes(value as ThanksPageType);
}

function isEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

function isPhone(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isTelegram(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /^@?[a-zA-Z0-9_]{5,32}$/.test(value.trim());
}

function normalizeTelegram(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/^@/, "");
  return normalized ? `@${normalized}` : null;
}

function pushDetail(rows: DetailRow[], label: string, value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return;
  }

  rows.push({ label, value: trimmed });
}

function buildDeliverySummary(args: {
  deliveryCity?: string | null;
  deliveryBranch?: string | null;
  deliveryAddress?: string | null;
}) {
  const rows: DetailRow[] = [];

  pushDetail(rows, "Місто доставки", args.deliveryCity);
  pushDetail(rows, "Відділення доставки", args.deliveryBranch);
  pushDetail(rows, "Адреса доставки", args.deliveryAddress);

  return rows;
}

function buildCustomerDetails(args: {
  name: string;
  phone?: string | null;
  email?: string | null;
  telegramUsername?: string | null;
  contact?: string | null;
  deliveryCity?: string | null;
  deliveryBranch?: string | null;
  deliveryAddress?: string | null;
  promoCode?: string | null;
  comment?: string | null;
  includeComment?: boolean;
}) {
  const rows: DetailRow[] = [{ label: "Ім’я", value: args.name }];
  const usedValues = new Set<string>();

  if (args.phone?.trim()) {
    const value = args.phone.trim();
    rows.push({ label: "Телефон", value });
    usedValues.add(value);
  }

  if (args.email?.trim()) {
    const value = args.email.trim();
    rows.push({ label: "Email", value });
    usedValues.add(value);
  }

  if (args.telegramUsername?.trim()) {
    const value = normalizeTelegram(args.telegramUsername);

    if (value) {
      rows.push({ label: "Telegram", value });
      usedValues.add(value);
    }
  }

  const rawContact = args.contact?.trim();
  if (rawContact && !usedValues.has(rawContact)) {
    if (isPhone(rawContact) && !rows.some((row) => row.label === "Телефон")) {
      rows.push({ label: "Телефон", value: rawContact });
    } else if (isEmail(rawContact) && !rows.some((row) => row.label === "Email")) {
      rows.push({ label: "Email", value: rawContact });
    } else if (isTelegram(rawContact) && !rows.some((row) => row.label === "Telegram")) {
      const normalizedTelegram = normalizeTelegram(rawContact);

      if (normalizedTelegram) {
        rows.push({ label: "Telegram", value: normalizedTelegram });
      }
    }
  }

  rows.push(
    ...buildDeliverySummary({
      deliveryCity: args.deliveryCity,
      deliveryBranch: args.deliveryBranch,
      deliveryAddress: args.deliveryAddress,
    }),
  );

  pushDetail(rows, "Промокод", args.promoCode);

  if (args.includeComment) {
    pushDetail(rows, "Коментар", args.comment);
  }

  return rows;
}

function buildSummaryItemsForBuildRequest(
  locale: AppLocale,
  items: ReturnType<typeof parseBuildRequestItemsSnapshot>,
): SummaryItem[] {
  return items.map((item) => ({
    title: item.productName,
    subtitle: item.slotLabel,
    quantity: item.quantity,
    unitPrice: formatPriceOrPlaceholder(item.price, locale, item.currency),
    totalPrice: formatPriceOrPlaceholder(item.price * item.quantity, locale, item.currency),
  }));
}

function buildSummaryItemsForOrder(
  locale: AppLocale,
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    currency: string;
    configuration: string | null;
  }>,
) {
  return items.map((item) => ({
    title: item.productName,
    subtitle: item.configuration ? getOrderItemConfigurationLabel(item.configuration, locale) : null,
    quantity: item.quantity,
    unitPrice: formatPriceOrPlaceholder(item.unitPrice, locale, item.currency),
    totalPrice: formatPriceOrPlaceholder(item.unitPrice * item.quantity, locale, item.currency),
  }));
}

function formatMoney(value: number | null | undefined, locale: AppLocale, currency: string) {
  return formatPriceOrPlaceholder(value ?? 0, locale, currency);
}

function inferAssemblyFee(args: {
  totalPrice: number;
  promoDiscountAmount: number;
  itemsSubtotal: number;
}) {
  return Math.max(0, args.totalPrice + args.promoDiscountAmount - args.itemsSubtotal);
}

async function getBuildRequestThanksData(id: string, locale: AppLocale): Promise<ThanksPageData | null> {
  const request = await db.pcBuildRequest.findUnique({
    where: { id },
    select: {
      customerName: true,
      contact: true,
      phone: true,
      email: true,
      budget: true,
      useCase: true,
      preferences: true,
      needsMonitor: true,
      needsPeripherals: true,
      needsUpgrade: true,
      comment: true,
      deliveryCity: true,
      deliveryBranch: true,
      telegramUsername: true,
      totalPrice: true,
      currency: true,
      itemsSnapshot: true,
      promoCodeCodeSnapshot: true,
      promoDiscountAmount: true,
    },
  });

  if (!request) {
    return null;
  }

  const snapshotItems = parseBuildRequestItemsSnapshot(request.itemsSnapshot);
  const isConfiguratorBuildRequest = snapshotItems.length > 0;
  const itemsSubtotal = snapshotItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const assemblyFee = inferAssemblyFee({
    totalPrice: request.totalPrice,
    promoDiscountAmount: request.promoDiscountAmount,
    itemsSubtotal,
  });
  const additionalNeeds = [
    request.needsMonitor ? "Потрібен монітор" : null,
    request.needsPeripherals ? "Потрібна периферія" : null,
    request.needsUpgrade ? "Потрібен апгрейд" : null,
  ]
    .filter(Boolean)
    .join(", ");
  const currency = request.currency || STOREFRONT_CURRENCY_CODE;
  const summaryDetails: DetailRow[] = [
    {
      label: "Тип заявки",
      value: isConfiguratorBuildRequest ? "Заявка на збірку з конфігуратора" : "Заявка на підбір ПК",
    },
  ];

  if (isConfiguratorBuildRequest) {
    if (assemblyFee > 0) {
      summaryDetails.push({
        label: "Вартість збірки",
        value: formatMoney(assemblyFee, locale, currency),
      });
    }

    if (request.promoDiscountAmount > 0) {
      summaryDetails.push({
        label: "Знижка",
        value: formatMoney(request.promoDiscountAmount, locale, currency),
      });
    }

    summaryDetails.push({
      label: "Разом",
      value: formatMoney(request.totalPrice, locale, currency),
    });
  } else {
    if (request.budget) {
      summaryDetails.push({
        label: "Бюджет",
        value: formatMoney(request.budget, locale, currency),
      });
    }

    pushDetail(summaryDetails, "Ціль ПК", request.useCase);
    pushDetail(summaryDetails, "Побажання", request.preferences);
    pushDetail(summaryDetails, "Додатково", additionalNeeds);
  }

  return {
    type: "build-request",
    heading: "Заявку отримано",
    message: "Дякуємо! Ми отримали вашу заявку. Менеджер скоро з вами зв’яжеться.",
    customerDetails: buildCustomerDetails({
      name: request.customerName,
      phone: request.phone,
      email: request.email,
      telegramUsername: request.telegramUsername,
      contact: request.contact,
      deliveryCity: request.deliveryCity,
      deliveryBranch: request.deliveryBranch,
      promoCode: request.promoCodeCodeSnapshot,
      comment: isConfiguratorBuildRequest ? request.comment : null,
      includeComment: isConfiguratorBuildRequest,
    }),
    summaryTitle: "Деталі заявки",
    summaryDetails,
    summaryItems: buildSummaryItemsForBuildRequest(locale, snapshotItems),
    flowCta: {
      href: "/configurator",
      label: isConfiguratorBuildRequest ? "Повернутися до конфігуратора" : "Зібрати ще один ПК",
    },
  };
}

async function getOrderThanksData(
  id: string,
  locale: AppLocale,
  type: Extract<ThanksPageType, "order" | "configurator-order">,
): Promise<ThanksPageData | null> {
  const order = await db.order.findUnique({
    where: { id },
    select: {
      customerName: true,
      phone: true,
      email: true,
      telegramUsername: true,
      comment: true,
      deliveryCity: true,
      deliveryAddress: true,
      deliveryBranch: true,
      totalPrice: true,
      currency: true,
      promoCodeCodeSnapshot: true,
      promoDiscountAmount: true,
      items: {
        orderBy: {
          id: "asc",
        },
        select: {
          productName: true,
          quantity: true,
          unitPrice: true,
          currency: true,
          configuration: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const currency = order.currency || STOREFRONT_CURRENCY_CODE;
  const itemsSubtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const assemblyFee = inferAssemblyFee({
    totalPrice: order.totalPrice,
    promoDiscountAmount: order.promoDiscountAmount,
    itemsSubtotal,
  });
  const hasConfiguratorItems = order.items.some((item) => parseOrderItemConfiguration(item.configuration));
  const summaryDetails: DetailRow[] = [];

  if (type === "configurator-order") {
    summaryDetails.push({
      label: "Збірка",
      value: hasConfiguratorItems ? "Увімкнена" : "Вимкнена",
    });
    summaryDetails.push({
      label: "Вартість збірки",
      value: formatMoney(assemblyFee, locale, currency),
    });
  }

  if (order.promoDiscountAmount > 0) {
    summaryDetails.push({
      label: "Знижка",
      value: formatMoney(order.promoDiscountAmount, locale, currency),
    });
  }

  summaryDetails.push({
    label: "Разом",
    value: formatMoney(order.totalPrice, locale, currency),
  });

  return {
    type,
    heading: "Дякуємо за замовлення",
    message: "Дякуємо! Ми отримали вашу заявку. Менеджер скоро з вами зв’яжеться.",
    customerDetails: buildCustomerDetails({
      name: order.customerName,
      phone: order.phone,
      email: order.email,
      telegramUsername: order.telegramUsername,
      deliveryCity: order.deliveryCity,
      deliveryBranch: order.deliveryBranch,
      deliveryAddress: order.deliveryAddress,
      promoCode: order.promoCodeCodeSnapshot,
      comment: order.comment,
      includeComment: true,
    }),
    summaryTitle: "Деталі замовлення",
    summaryDetails,
    summaryItems: buildSummaryItemsForOrder(locale, order.items),
    flowCta:
      type === "configurator-order"
        ? {
            href: "/configurator",
            label: "Повернутися до конфігуратора",
          }
        : null,
  };
}

export async function getThanksPageData(args: {
  type?: string;
  id?: string;
  locale: AppLocale;
}): Promise<ThanksPageData | null> {
  if (!args.id || !isThanksPageType(args.type)) {
    return null;
  }

  if (args.type === "build-request") {
    return getBuildRequestThanksData(args.id, args.locale);
  }

  return getOrderThanksData(args.id, args.locale, args.type);
}
