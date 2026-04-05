import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIpFromRequest } from "@/lib/network/request";
import { trackAnalyticsEvent } from "@/lib/observability/analytics";
import { reportServerError } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createBuildRequestForBuild } from "@/lib/storefront/build-request-data";
import { isBuildRequestDeliveryMethod } from "@/lib/storefront/build-requests";
import { assertLocale } from "@/lib/utils";

const createRequestSchema = z.object({
  locale: z.string(),
  fullName: z.string(),
  phone: z.string(),
  email: z.string(),
  comment: z.string().optional(),
  deliveryCity: z.string(),
  deliveryMethod: z.string(),
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/configurator/builds/[slug]/requests">,
) {
  const { slug } = await context.params;
  try {
    const ip = getClientIpFromRequest(request);
    const limit = checkRateLimit({
      namespace: "build-request",
      key: `${ip}:${slug}`,
      limit: 3,
      windowMs: 10 * 60 * 1000,
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many build requests. Please try again a bit later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const parsed = createRequestSchema.safeParse(body);

    if (
      !parsed.success ||
      !assertLocale(parsed.data.locale) ||
      !isBuildRequestDeliveryMethod(parsed.data.deliveryMethod)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await createBuildRequestForBuild({
      slug,
      payload: {
        locale: parsed.data.locale,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email,
        comment: parsed.data.comment,
        deliveryCity: parsed.data.deliveryCity,
        deliveryMethod: parsed.data.deliveryMethod as "NOVA_POSHTA_BRANCH" | "NOVA_POSHTA_COURIER",
      },
    });

    if (!result.ok) {
      const status =
        result.error === "Build not found"
          ? 404
          : result.error === "Build is empty"
            ? 409
            : result.error === "Too many duplicate requests"
              ? 429
              : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    await trackAnalyticsEvent({
      event: "build_request_submit",
      pathname: `/${parsed.data.locale}/configurator`,
      locale: parsed.data.locale,
      ip,
      details: {
        buildSlug: slug,
        requestNumber: result.request.number,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    await reportServerError(error, {
      area: "configurator.build-request.route",
      message: "Build request submission failed",
      details: { slug },
    });

    return NextResponse.json(
      { error: "Could not submit the build request right now. Please try again." },
      { status: 500 },
    );
  }
}
