import { db } from "@/lib/db";
import { getSiteSettingsRecord } from "@/lib/site-config";
import {
  computePcAssemblyServiceFeeUah,
  resolveAssemblyFeeSettings,
} from "@/lib/storefront/pc-assembly-fee";
import {
  buildCheckoutTotalsPreview,
  cartItemsIncludeConfiguratorBuild,
  computePromoMonetaryEffect,
  normalizePromoCodeKey,
  PROMO_ERROR_MESSAGES_UK,
  validatePromoRecordWindow,
  validatePromoValueShape,
  type PromoValidationErrorCode,
} from "@/lib/storefront/promo-codes";
import { getOwnershipWhere, resolveStorefrontOwner } from "@/lib/storefront/persistence";
import type { AppLocale } from "@/lib/constants";
import { STOREFRONT_CURRENCY_CODE } from "@/lib/utils";

function mapPromoError(code: PromoValidationErrorCode): string {
  return PROMO_ERROR_MESSAGES_UK[code];
}

export async function applyPromoCodeToCart(rawCode: string, locale: AppLocale) {
  const owner = await resolveStorefrontOwner({ ensureSession: true });
  const where = getOwnershipWhere(owner);

  if (!where) {
    return {
      ok: false as const,
      error: "Не вдалося визначити кошик",
      code: undefined,
    };
  }

  const key = normalizePromoCodeKey(rawCode);

  if (key.length < 2) {
    return {
      ok: false as const,
      error: PROMO_ERROR_MESSAGES_UK.NOT_FOUND,
      code: "NOT_FOUND" as const,
    };
  }

  const [cart, promo, settings] = await Promise.all([
    db.cart.findFirst({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                price: true,
                currency: true,
              },
            },
          },
        },
      },
    }),
    db.promoCode.findUnique({
      where: {
        codeKey: key,
      },
    }),
    getSiteSettingsRecord(),
  ]);

  if (!cart || cart.items.length === 0) {
    return {
      ok: false as const,
      error: "Кошик порожній",
      code: undefined,
    };
  }

  const validated = validatePromoRecordWindow(promo, new Date());

  if (!validated.ok) {
    return {
      ok: false as const,
      error: mapPromoError(validated.code),
      code: validated.code,
    };
  }

  const valueOk = validatePromoValueShape(validated.promo);

  if (!valueOk.ok) {
    return {
      ok: false as const,
      error: mapPromoError(valueOk.code),
      code: valueOk.code,
    };
  }

  if (cart.promoCodeId === validated.promo.id) {
    return {
      ok: true as const,
      alreadyApplied: true as const,
      preview: await getCartPromoPreviewForOwner(owner, locale),
    };
  }

  const componentsSubtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const hasConfiguratorItems = cartItemsIncludeConfiguratorBuild(cart.items);
  const assemblyFeeBefore = computePcAssemblyServiceFeeUah({
    componentsSubtotal,
    hasPcBuild: hasConfiguratorItems,
    ...resolveAssemblyFeeSettings(settings),
  });

  const effect = computePromoMonetaryEffect({
    promo: validated.promo,
    componentsSubtotal,
    assemblyFeeBefore,
    hasConfiguratorItems,
  });

  if (!effect.ok) {
    return {
      ok: false as const,
      error: mapPromoError(effect.code),
      code: effect.code,
    };
  }

  await db.cart.update({
    where: {
      id: cart.id,
    },
    data: {
      promoCodeId: validated.promo.id,
    },
  });

  return {
    ok: true as const,
    alreadyApplied: false as const,
    preview: await getCartPromoPreviewForOwner(owner, locale),
  };
}

export async function removePromoCodeFromCart() {
  const owner = await resolveStorefrontOwner({ ensureSession: true });
  const where = getOwnershipWhere(owner);

  if (!where) {
    return {
      ok: false as const,
      error: "Не вдалося визначити кошик",
    };
  }

  const cart = await db.cart.findFirst({
    where,
    select: {
      id: true,
    },
  });

  if (!cart) {
    return {
      ok: false as const,
      error: "Кошик не знайдено",
    };
  }

  await db.cart.update({
    where: {
      id: cart.id,
    },
    data: {
      promoCodeId: null,
    },
  });

  return {
    ok: true as const,
  };
}

export async function getCartPromoPreviewForOwner(
  owner: Awaited<ReturnType<typeof resolveStorefrontOwner>>,
  locale: AppLocale,
) {
  const where = getOwnershipWhere(owner);

  if (!where) {
    return null;
  }

  const cart = await db.cart.findFirst({
    where,
    include: {
      items: {
        include: {
          product: {
            select: {
              price: true,
              currency: true,
            },
          },
        },
      },
      promoCode: true,
    },
  });

  if (!cart?.items.length) {
    return null;
  }

  const settings = await getSiteSettingsRecord();
  const componentsSubtotal = cart.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const hasConfiguratorItems = cartItemsIncludeConfiguratorBuild(cart.items);
  const assemblyFeeBefore = computePcAssemblyServiceFeeUah({
    componentsSubtotal,
    hasPcBuild: hasConfiguratorItems,
    ...resolveAssemblyFeeSettings(settings),
  });
  const currency = cart.items[0]?.product.currency ?? STOREFRONT_CURRENCY_CODE;

  return buildCheckoutTotalsPreview({
    componentsSubtotal,
    assemblyFeeBefore,
    hasConfiguratorItems,
    promo: cart.promoCode,
    locale,
    currency,
  });
}
