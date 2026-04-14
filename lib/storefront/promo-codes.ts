import type { PromoCode, PromoCodeType } from "@prisma/client";
import { parseOrderItemConfiguration } from "@/lib/storefront/orders";
import { formatPrice } from "@/lib/utils";
import type { AppLocale } from "@/lib/constants";

export type PromoValidationErrorCode =
  | "NOT_FOUND"
  | "INACTIVE"
  | "EXPIRED"
  | "NOT_STARTED"
  | "LIMIT_REACHED"
  | "ALREADY_APPLIED"
  | "INAPPLICABLE_FREE_BUILD"
  | "INVALID_PERCENT"
  | "INVALID_FIXED";

export const PROMO_ERROR_MESSAGES_UK: Record<PromoValidationErrorCode, string> = {
  NOT_FOUND: "Промокод не знайдено",
  INACTIVE: "Промокод неактивний",
  EXPIRED: "Термін дії промокоду вичерпано",
  NOT_STARTED: "Промокод ще не почав діяти",
  LIMIT_REACHED: "Ліміт використань промокоду вичерпано",
  ALREADY_APPLIED: "Промокод уже застосовано",
  INAPPLICABLE_FREE_BUILD: "Промокод не застосовується до поточного кошика",
  INVALID_PERCENT: "Некоректне значення знижки у відсотках",
  INVALID_FIXED: "Некоректна фіксована знижка",
};

export function normalizePromoCodeKey(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toUpperCase();
}

export function cartItemsIncludeConfiguratorBuild(
  items: Array<{ configuration: string | null }>,
): boolean {
  return items.some((item) => parseOrderItemConfiguration(item.configuration ?? null) !== null);
}

export type PromoMonetaryResult = {
  componentsSubtotal: number;
  assemblyFeeOriginal: number;
  assemblyFeeAfter: number;
  merchandiseDiscountAmount: number;
  assemblyWaiverAmount: number;
  promoDiscountAmount: number;
  finalTotal: number;
};

export function validatePromoRecordWindow(
  promo: PromoCode | null,
  now: Date,
):
  | { ok: true; promo: PromoCode }
  | { ok: false; code: PromoValidationErrorCode } {
  if (!promo) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (!promo.isActive) {
    return { ok: false, code: "INACTIVE" };
  }

  if (promo.validFrom && now < promo.validFrom) {
    return { ok: false, code: "NOT_STARTED" };
  }

  if (promo.validUntil && now > promo.validUntil) {
    return { ok: false, code: "EXPIRED" };
  }

  if (promo.usageLimit !== null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, code: "LIMIT_REACHED" };
  }

  return { ok: true, promo };
}

export function validatePromoValueShape(promo: Pick<PromoCode, "type" | "value">):
  | { ok: true }
  | { ok: false; code: PromoValidationErrorCode } {
  if (promo.type === "PERCENT_DISCOUNT") {
    if (promo.value < 1 || promo.value > 100) {
      return { ok: false, code: "INVALID_PERCENT" };
    }
  }

  if (promo.type === "FIXED_DISCOUNT" && promo.value <= 0) {
    return { ok: false, code: "INVALID_FIXED" };
  }

  return { ok: true };
}

export function computePromoMonetaryEffect(args: {
  promo: Pick<PromoCode, "type" | "value">;
  componentsSubtotal: number;
  assemblyFeeBefore: number;
  hasConfiguratorItems: boolean;
}): { ok: true; result: PromoMonetaryResult } | { ok: false; code: PromoValidationErrorCode } {
  const shape = validatePromoValueShape(args.promo);
  if (!shape.ok) {
    return shape;
  }

  let merch = Math.max(0, args.componentsSubtotal);
  let asm = args.hasConfiguratorItems ? Math.max(0, args.assemblyFeeBefore) : 0;

  let assemblyWaiver = 0;
  let merchandiseDiscountAmount = 0;
  let fixedDiscountAmount = 0;

  switch (args.promo.type) {
    case "FREE_BUILD": {
      if (!args.hasConfiguratorItems || asm <= 0) {
        return { ok: false, code: "INAPPLICABLE_FREE_BUILD" };
      }
      assemblyWaiver = asm;
      asm = 0;
      break;
    }
    case "PERCENT_DISCOUNT": {
      merchandiseDiscountAmount = Math.floor((merch * args.promo.value) / 100);
      break;
    }
    case "FIXED_DISCOUNT": {
      fixedDiscountAmount = Math.min(args.promo.value, merch + asm);
      break;
    }
    default: {
      return { ok: false, code: "NOT_FOUND" };
    }
  }

  const promoDiscountAmount =
    args.promo.type === "FREE_BUILD"
      ? assemblyWaiver
      : args.promo.type === "PERCENT_DISCOUNT"
        ? merchandiseDiscountAmount
        : fixedDiscountAmount;

  const finalTotal = Math.max(
    0,
    merch + asm - merchandiseDiscountAmount - fixedDiscountAmount,
  );

  return {
    ok: true,
    result: {
      componentsSubtotal: args.componentsSubtotal,
      assemblyFeeOriginal: args.hasConfiguratorItems ? Math.max(0, args.assemblyFeeBefore) : 0,
      assemblyFeeAfter: asm,
      merchandiseDiscountAmount,
      assemblyWaiverAmount: assemblyWaiver,
      promoDiscountAmount,
      finalTotal,
    },
  };
}

/** Коротка назва типу ефекту для карток замовлення / заявок (українською). */
export function getPromoEffectTypeLabelUa(type: PromoCodeType | null | undefined): string {
  if (!type) {
    return "—";
  }

  switch (type) {
    case "PERCENT_DISCOUNT":
      return "Знижка у відсотках";
    case "FIXED_DISCOUNT":
      return "Фіксована знижка";
    case "FREE_BUILD":
      return "Безкоштовна збірка";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function getPromoEffectDescriptionUa(args: {
  type: PromoCodeType;
  value: number;
  locale: AppLocale;
  currency: string;
}): string {
  switch (args.type) {
    case "PERCENT_DISCOUNT":
      return `Знижка ${args.value}%`;
    case "FIXED_DISCOUNT":
      return `Знижка ${formatPrice(args.value, args.locale, args.currency)}`;
    case "FREE_BUILD":
      return "Безкоштовна збірка";
    default: {
      const _e: never = args.type;
      return _e;
    }
  }
}

export type CheckoutTotalsPreview = PromoMonetaryResult & {
  promo: Pick<PromoCode, "id" | "code" | "type" | "value" | "title"> | null;
  /** Короткий опис ефекту промокоду українською (для підсумку) */
  effectDescription: string | null;
};

export function buildCheckoutTotalsPreview(args: {
  componentsSubtotal: number;
  assemblyFeeBefore: number;
  hasConfiguratorItems: boolean;
  promo: PromoCode | null;
  locale: AppLocale;
  currency: string;
}): CheckoutTotalsPreview {
  const base: PromoMonetaryResult = {
    componentsSubtotal: args.componentsSubtotal,
    assemblyFeeOriginal: args.hasConfiguratorItems ? Math.max(0, args.assemblyFeeBefore) : 0,
    assemblyFeeAfter: args.hasConfiguratorItems ? Math.max(0, args.assemblyFeeBefore) : 0,
    merchandiseDiscountAmount: 0,
    assemblyWaiverAmount: 0,
    promoDiscountAmount: 0,
    finalTotal: Math.max(0, args.componentsSubtotal + (args.hasConfiguratorItems ? args.assemblyFeeBefore : 0)),
  };

  if (!args.promo) {
    return {
      ...base,
      promo: null,
      effectDescription: null,
    };
  }

  const computed = computePromoMonetaryEffect({
    promo: args.promo,
    componentsSubtotal: args.componentsSubtotal,
    assemblyFeeBefore: args.assemblyFeeBefore,
    hasConfiguratorItems: args.hasConfiguratorItems,
  });

  if (!computed.ok) {
    return {
      ...base,
      promo: null,
      effectDescription: null,
    };
  }

  const effectDescription = getPromoEffectDescriptionUa({
    type: args.promo.type,
    value: args.promo.value,
    locale: args.locale,
    currency: args.currency,
  });

  return {
    ...computed.result,
    promo: {
      id: args.promo.id,
      code: args.promo.code,
      type: args.promo.type,
      value: args.promo.value,
      title: args.promo.title,
    },
    effectDescription,
  };
}
