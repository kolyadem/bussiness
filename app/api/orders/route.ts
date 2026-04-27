import { NextResponse } from "next/server";
import { getClientIpFromRequest } from "@/lib/network/request";
import { reportServerError } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getSessionId } from "@/lib/session";
import { createOrderFromCart } from "@/lib/storefront/order-data";

export async function POST(request: Request) {
  try {
    const [sessionId, body] = await Promise.all([
      getSessionId(),
      request.json().catch(() => null),
    ]);
    const limit = checkRateLimit({
      namespace: "checkout",
      key: `${getClientIpFromRequest(request)}:${sessionId ?? "anonymous"}`,
      limit: 6,
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Забагато спроб оформлення. Спробуйте ще раз за кілька хвилин." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const result = await createOrderFromCart(body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      thanksType: result.thanksType,
    });
  } catch (error) {
    await reportServerError(error, {
      area: "orders.route.post",
      message: "Failed to place storefront order",
    });

    return NextResponse.json(
      { error: "Не вдалося оформити замовлення зараз. Спробуйте пізніше." },
      { status: 500 },
    );
  }
}
