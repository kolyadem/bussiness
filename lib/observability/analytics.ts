import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const analyticsEventNames = [
  "page_view",
  "add_to_cart",
  "configurator_open",
  "build_request_submit",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

const ANALYTICS_DIR = path.join(process.cwd(), "var", "log");
const ANALYTICS_LOG_PATH = path.join(ANALYTICS_DIR, "analytics.log");

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return analyticsEventNames.includes(value as AnalyticsEventName);
}

export async function trackAnalyticsEvent(input: {
  event: AnalyticsEventName;
  pathname?: string;
  locale?: string;
  ip?: string;
  sessionId?: string | null;
  details?: Record<string, unknown>;
}) {
  const payload = {
    timestamp: new Date().toISOString(),
    ...input,
  };

  try {
    await mkdir(ANALYTICS_DIR, { recursive: true });
    await appendFile(ANALYTICS_LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // Analytics must stay non-blocking.
  }
}
