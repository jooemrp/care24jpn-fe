import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { DEFAULT_LANG, isLang } from "@/features/lang/i18n";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const firstSegment = pathname.split("/")[1] ?? "";

  if (isLang(firstSegment)) {
    return NextResponse.next();
  }

  const suffix = pathname === "/" ? "" : pathname;

  return NextResponse.redirect(
    new URL(`/${DEFAULT_LANG}${suffix}${search}`, request.url),
  );
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
