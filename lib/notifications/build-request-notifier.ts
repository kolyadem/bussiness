import type { AppLocale } from "@/lib/constants";
import { getAbsoluteLocalizedUrl } from "@/lib/storefront/seo";
import { getBuildRequestNumber } from "@/lib/storefront/build-requests";
import { logEvent, reportServerError } from "@/lib/observability/logger";

type BuildRequestNotificationPayload = {
  requestId: string;
  locale: AppLocale;
  customerName: string;
  contact: string;
  source?: string | null;
  kind: "configurator" | "quick_inquiry";
  budget?: number | null;
  currency?: string | null;
  useCase?: string | null;
  telegramUsername?: string | null;
  deliveryBranch?: string | null;
  deliveryMethod?: string | null;
  promoCodeCodeSnapshot?: string | null;
  promoEffectType?: string | null;
  promoDiscountAmount?: number | null;
};

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (!amount || !currency) {
    return "—";
  }

  const normalizedAmount = amount / 100;

  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(normalizedAmount);
  } catch {
    return `${normalizedAmount.toFixed(2)} ${currency}`;
  }
}

function formatPromoEffectType(type: string | null | undefined): string {
  switch (type) {
    case "FREE_BUILD":
      return "Безкоштовна збірка";
    case "PERCENT_DISCOUNT":
      return "Знижка у відсотках";
    case "FIXED_DISCOUNT":
      return "Фіксована знижка";
    default:
      return type ?? "—";
  }
}

function truncateText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "—";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function getTelegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const buildRequestChatId = process.env.TELEGRAM_BUILD_REQUEST_CHAT_ID?.trim();

  if (!botToken || !buildRequestChatId) {
    return null;
  }

  return { botToken, buildRequestChatId };
}

function buildTelegramMessage(payload: BuildRequestNotificationPayload) {
  const number = getBuildRequestNumber(payload.requestId);
  const adminUrl = getAbsoluteLocalizedUrl(payload.locale, `/admin/build-requests/${payload.requestId}`);
  const flow =
    payload.kind === "quick_inquiry" ? "Швидкий запит" : "Конфігуратор";
  const deliveryLine =
    payload.deliveryMethod && payload.kind === "configurator"
      ? `Доставка: ${payload.deliveryMethod}${payload.deliveryBranch ? `, відд. ${truncateText(payload.deliveryBranch, 32)}` : ""}`
      : null;

  const promoLines =
    payload.promoCodeCodeSnapshot
      ? [
          `Промокод: ${payload.promoCodeCodeSnapshot}`,
          `Ефект: ${formatPromoEffectType(payload.promoEffectType)}`,
          payload.promoDiscountAmount && payload.promoDiscountAmount > 0
            ? `Знижка: −${formatMoney(payload.promoDiscountAmount, payload.currency)}`
            : null,
        ].filter(Boolean)
      : [];

  return [
    `Нова заявка на збірку · ${number}`,
    `Клієнт: ${truncateText(payload.customerName, 120)}`,
    `Контакт: ${truncateText(payload.contact, 160)}`,
    payload.telegramUsername ? `Telegram: ${truncateText(payload.telegramUsername, 64)}` : null,
    `Бюджет / сума: ${formatMoney(payload.budget, payload.currency)}`,
    `Задача: ${truncateText(payload.useCase, 220)}`,
    promoLines.length > 0 ? promoLines.join("\n") : null,
    `Канал: ${flow}`,
    deliveryLine,
    payload.source ? `Джерело: ${truncateText(payload.source, 120)}` : null,
    `Адмінка: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegramBuildRequestNotification(payload: BuildRequestNotificationPayload) {
  const config = getTelegramConfig();

  if (!config) {
    return { ok: false as const, reason: "disabled" as const };
  }

  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: config.buildRequestChatId,
      text: buildTelegramMessage(payload),
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");

    return {
      ok: false as const,
      reason: "telegram_error" as const,
      status: response.status,
      details: truncateText(details, 300),
    };
  }

  return { ok: true as const };
}

export async function notifyBuildRequestCreated(payload: BuildRequestNotificationPayload) {
  try {
    const telegramResult = await sendTelegramBuildRequestNotification(payload);

    if (!telegramResult.ok && telegramResult.reason !== "disabled") {
      await logEvent("warn", "Telegram build request notification failed", {
        area: "build-request.notification",
        requestId: payload.requestId,
        kind: payload.kind,
        channel: "telegram",
        reason: telegramResult.reason,
        status: "status" in telegramResult ? telegramResult.status : null,
        details: "details" in telegramResult ? telegramResult.details : null,
      });
    }

    await logEvent("info", "Build request created", {
      area: "build-request.notification",
      requestId: payload.requestId,
      locale: payload.locale,
      customerName: payload.customerName,
      contact: payload.contact,
      source: payload.source ?? null,
      kind: payload.kind,
      channels: {
        telegram: telegramResult.ok ? "sent" : telegramResult.reason,
        email: "not_configured",
      },
    });
  } catch (error) {
    await reportServerError(error, {
      area: "build-request.notification",
      message: "Build request notification dispatch failed",
      details: {
        requestId: payload.requestId,
        kind: payload.kind,
      },
    });
  }
}
