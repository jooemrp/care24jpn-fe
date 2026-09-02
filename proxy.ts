import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LANG, isLang } from "@/features/lang/i18n";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const firstSegment = pathname.split("/")[1] ?? "";

  if (firstSegment === DEFAULT_LANG) {
    // "/ja/..." is no longer a public URL — the default language now lives
    // at the bare path. Send old/bookmarked links to their new home.
    const rest = pathname.slice(`/${DEFAULT_LANG}`.length);
    return NextResponse.redirect(
      new URL(`${rest || "/"}${search}`, request.url),
      308,
    );
  }

  if (isLang(firstSegment)) {
    // A still-prefixed, non-default locale (e.g. "en") — serve as-is.
    return NextResponse.next();
  }

  // No locale prefix: resolve against the default locale's route
  // internally, without changing what's shown in the address bar.
  return NextResponse.rewrite(
    new URL(
      `/${DEFAULT_LANG}${pathname === "/" ? "" : pathname}${search}`,
      request.url,
    ),
  );
}

export const config = {
  // `api` (route handlers under /api/*) must bypass the i18n rewrite: the
  // contact proxy POSTs to the bare /api/contact and must not be rewritten
  // to /ja/api/contact (which would also re-enter this middleware).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
