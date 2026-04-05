import { NextResponse } from "next/server";
import { z } from "zod";
import { trackAnalyticsEvent, isAnalyticsEventName } from "@/lib/observability/analytics";
import { getClientIpFromRequest } from "@/lib/network/request";
import { getSessionId } from "@/lib/session";

const analyticsSchema = z.object({
  event: z.string(),
  pathname: z.string().max(512).optional(),
  locale: z.string().max(12).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analyticsSchema.safeParse(body);

  if (!parsed.success || !isAnalyticsEventName(parsed.data.event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await trackAnalyticsEvent({
    event: parsed.data.event,
    pathname: parsed.data.pathname,
    locale: parsed.data.locale,
    ip: getClientIpFromRequest(request),
    sessionId: await getSessionId(),
    details: parsed.data.details,
  });

  return NextResponse.json({ ok: true });
}
