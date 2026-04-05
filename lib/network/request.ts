import { headers } from "next/headers";

function getFirstForwardedIp(value: string | null | undefined) {
  return value?.split(",")[0]?.trim() ?? null;
}

export function getClientIpFromRequest(request: Request) {
  const directCandidates = [
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
    request.headers.get("cf-connecting-ip"),
  ];

  for (const candidate of directCandidates) {
    const ip = getFirstForwardedIp(candidate);

    if (ip) {
      return ip;
    }
  }

  return "unknown";
}

export async function getClientIpFromHeaders() {
  const requestHeaders = await headers();
  const candidates = [
    requestHeaders.get("x-forwarded-for"),
    requestHeaders.get("x-real-ip"),
    requestHeaders.get("cf-connecting-ip"),
  ];

  for (const candidate of candidates) {
    const ip = getFirstForwardedIp(candidate);

    if (ip) {
      return ip;
    }
  }

  return "unknown";
}
