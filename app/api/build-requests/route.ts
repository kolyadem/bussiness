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
        { error: "Забагато заявок за короткий час. Спробуйте пізніше." },
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
      return NextResponse.json({ error: "Некоректні дані запиту" }, { status: 400 });
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
        result.error === "Забагато схожих заявок за короткий час"
          ? 429
          : result.error === "Некоректний бюджет" ||
              result.error === "Некоректний контакт" ||
              result.error === "Запит містить непідтримуваний вміст" ||
              result.error === "Виявлено спам"
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
      { error: "Не вдалося надіслати заявку. Спробуйте ще раз пізніше." },
      { status: 500 },
    );
  }
}
