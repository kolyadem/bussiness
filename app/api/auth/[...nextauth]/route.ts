import NextAuth from "next-auth";
import { assertAuthSecretConfigured, authOptions } from "@/lib/auth";
import { getClientIpFromRequest } from "@/lib/network/request";
import { reportServerError } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const authHandler = NextAuth(authOptions);

async function handler(request: Request, context: { params: Promise<{ nextauth: string[] }> }) {
  try {
    assertAuthSecretConfigured();

    const { nextauth } = await context.params;
    const isCredentialsCallback =
      request.method === "POST" &&
      nextauth[0] === "callback" &&
      nextauth[1] === "credentials";

    if (isCredentialsCallback) {
      const formData = await request.clone().formData().catch(() => null);
      const login = String(formData?.get("login") ?? "")
        .trim()
        .toLowerCase();
      const ip = getClientIpFromRequest(request);
      const rateKey = `${ip}:${login || "anonymous"}`;
      const limit = checkRateLimit({
        namespace: "login",
        key: rateKey,
        limit: 5,
        windowMs: 10 * 60 * 1000,
      });

      if (!limit.allowed) {
        return new Response("Too many login attempts. Please try again later.", {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        });
      }
    }

    return authHandler(request, context);
  } catch (error) {
    await reportServerError(error, {
      area: "auth.route",
      message: "Auth handler failed",
      details: {
        method: request.method,
        url: request.url,
      },
    });

    return new Response("Authentication is temporarily unavailable.", {
      status: 503,
    });
  }
}

export { handler as GET, handler as POST };
