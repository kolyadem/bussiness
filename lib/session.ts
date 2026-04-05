import { cookies, headers } from "next/headers";

export const SESSION_COOKIE = "lumina-session";
export const RECENTLY_VIEWED_COOKIE = "lumina-recently-viewed";

export async function getSessionId() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

function isLocalHostName(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase().trim();
  const hostname = normalized.split(":")[0];

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
}

async function shouldUseSecureSessionCookie() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const requestHeaders = await headers();
  const forwardedProto = requestHeaders.get("x-forwarded-proto");
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host");
  const origin = requestHeaders.get("origin");
  const referer = requestHeaders.get("referer");

  if (isLocalHostName(host)) {
    return false;
  }

  for (const candidate of [origin, referer]) {
    if (!candidate) {
      continue;
    }

    try {
      const parsed = new URL(candidate);

      if (isLocalHostName(parsed.host)) {
        return false;
      }

      return parsed.protocol === "https:";
    } catch {
      continue;
    }
  }

  if (forwardedProto) {
    return forwardedProto.toLowerCase().includes("https");
  }

  return false;
}

export async function ensureSessionId() {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  const secure = await shouldUseSecureSessionCookie();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    priority: "high",
    maxAge: 60 * 60 * 24 * 30,
  });

  return sessionId;
}

export async function getRecentlyViewedProductIds() {
  const store = await cookies();
  const raw = store.get(RECENTLY_VIEWED_COOKIE)?.value;

  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}
