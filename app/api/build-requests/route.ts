import { NextResponse } from "next/server";
import { z } from "zod";
import { getClientIpFromRequest } from "@/lib/network/request";
import { trackAnalyticsEvent } from "@/lib/observability/analytics";
import { reportServerError } from "@/lib/observability/logger";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { createQuickBuildRequest } from "@/lib/storefront/build-request-data";
import { assertLocale } from "@/lib/utils";

const createRequestSchema = z.object({
  locale: z.string(),
  fullName: z.string(),
  contact: z.string(),
  budget: z.string(),
  useCase: z.string(),
  preferences: z.string().optional(),
  needsMonitor: z.boolean().optional(),
  needsPeripherals: z.boolean().optional(),
  needsUpgrade: z.boolean().optional(),
  source: z.string().optional(),
  website: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromRequest(request);
    const limit = checkRateLimit({
      namespace: "quick-build-request",
      key: ip,
      limit: 4,
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

    if (!parsed.success || !assertLocale(parsed.data.locale)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await createQuickBuildRequest({
      locale: parsed.data.locale,
      fullName: parsed.data.fullName,
      contact: parsed.data.contact,
      budget: parsed.data.budget,
      useCase: parsed.data.useCase,
      preferences: parsed.data.preferences ?? "",
      needsMonitor: parsed.data.needsMonitor ?? false,
      needsPeripherals: parsed.data.needsPeripherals ?? false,
      needsUpgrade: parsed.data.needsUpgrade ?? false,
      source: parsed.data.source ?? "",
      website: parsed.data.website ?? "",
    });

    if (!result.ok) {
      const status =
        result.error === "Too many duplicate requests"
          ? 429
          : result.error === "Budget is invalid" ||
              result.error === "Contact is invalid" ||
              result.error === "Request contains unsupported content" ||
              result.error === "Spam detected"
            ? 400
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    await trackAnalyticsEvent({
      event: "build_request_submit",
      pathname: `/${parsed.data.locale}/build-request`,
      locale: parsed.data.locale,
      ip,
      details: {
        requestNumber: result.request.number,
        source: parsed.data.source ?? "",
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    await reportServerError(error, {
      area: "build-request.route",
      message: "Quick build request submission failed",
    });

    return NextResponse.json(
      { error: "Could not submit the build request right now. Please try again." },
      { status: 500 },
    );
  }
}
