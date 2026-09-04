import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LANG, isLang } from "@/features/lang/i18n";

/**
 * Locale routing for App Router.
 *
 * - Bare paths (`/`, `/pricing`) rewrite internally to `/${DEFAULT_LANG}/...`
 *   without changing the address bar.
 * - Prefixed non-default locales (`/en/...`) pass through.
 * - Incoming `/ja/...` bookmarks 308 to the prefix-less URL, but ONLY when the
 *   request did not already come from our own rewrite (Next 16 re-enters this
 *   file on the rewrite destination; without the guard that becomes a loop).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  // Set on the rewrite response below; present when Next re-invokes proxy on
  // the internal `/ja/...` destination. Skip the public /ja → / redirect then.
  const fromBareRewrite = request.headers.get("x-care24-locale-rewrite") === "1";

  if (firstSegment === DEFAULT_LANG) {
    if (fromBareRewrite) {
      return NextResponse.next();
    }
    const rest = pathname.slice(`/${DEFAULT_LANG}`.length);
    const url = request.nextUrl.clone();
    url.pathname = rest || "/";
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  if (isLang(firstSegment)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}`;
  url.search = search;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-care24-locale-rewrite", "1");
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export const config = {
  // `api` (route handlers under /api/*) must bypass the i18n rewrite: the
  // contact proxy POSTs to the bare /api/contact and must not be rewritten
  // to /ja/api/contact (which would also re-enter this middleware).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
