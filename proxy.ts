import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const LEGACY_LOCALE_PREFIX = /^\/(uk|ru|en)(\/|$)/;

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LEGACY_LOCALE_PREFIX.test(pathname)) {
    const nextPath = pathname.replace(/^\/(uk|ru|en)/, "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = nextPath;
    return NextResponse.redirect(url, 308);
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
