import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIpFromRequest } from "@/lib/network/request";
import { reportServerError } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getSessionId } from "@/lib/session";
import { assertLocale } from "@/lib/utils";
import {
  applyPromoCodeToCart,
  removePromoCodeFromCart,
} from "@/lib/storefront/cart-promo";

const bodySchema = z.object({
  locale: z.string().min(2).max(5),
  code: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  try {
    const [sessionId, body] = await Promise.all([
      getSessionId(),
      request.json().catch(() => null),
    ]);
    const limit = checkRateLimit({
      namespace: "cart-promo",
      key: `${getClientIpFromRequest(request)}:${sessionId ?? "anonymous"}`,
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Забагато спроб. Спробуйте пізніше." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const parsed = bodySchema.safeParse(body);

    if (!parsed.success || !assertLocale(parsed.data.locale)) {
      return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
    }

    const result = await applyPromoCodeToCart(parsed.data.code, parsed.data.locale);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...("code" in result && result.code !== undefined ? { code: result.code } : {}),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyApplied: "alreadyApplied" in result ? result.alreadyApplied : false,
      preview: result.preview,
    });
  } catch (error) {
    await reportServerError(error, {
      area: "cart.promo.post",
      message: "Failed to apply promo to cart",
    });

    return NextResponse.json({ error: "Не вдалося застосувати промокод." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await removePromoCodeFromCart();

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await reportServerError(error, {
      area: "cart.promo.delete",
      message: "Failed to remove cart promo",
    });

    return NextResponse.json({ error: "Не вдалося скинути промокод." }, { status: 500 });
  }
}
