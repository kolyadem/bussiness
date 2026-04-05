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
        { error: "Too many checkout attempts. Please try again in a few minutes." },
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

    return NextResponse.json({ ok: true, orderId: result.orderId });
  } catch (error) {
    await reportServerError(error, {
      area: "orders.route.post",
      message: "Failed to place storefront order",
    });

    return NextResponse.json(
      { error: "Could not place the order right now" },
      { status: 500 },
    );
  }
}
