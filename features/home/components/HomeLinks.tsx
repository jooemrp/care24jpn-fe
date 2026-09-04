import Link from "next/link";
import type { ReactNode } from "react";
import { CmsContentError } from "@/features/cms/errors";
import { localizeHref, type Lang } from "@/features/lang/i18n";

export function isSafeExternalHref(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Keep CMS-controlled CTA values navigable without allowing a non-http
 * scheme to reach a link. Relative paths and fragments retain the site's
 * locale prefixing behavior. Invalid values fail closed instead of silently
 * redirecting visitors to a bundled home route.
 */
export function safeLocalizedHref(href: string, lang: Lang): string {
  if (isSafeExternalHref(href) || href.startsWith("#")) return href;
  if (href.startsWith("//")) {
    throw new CmsContentError(
      "CMS_INVALID_REQUIRED_FIELD",
      `CMS navigation URL "${href}" is not a valid absolute or internal URL.`,
      ["home.navigation.href"],
      "home",
    );
  }
  if (href.startsWith("/")) return localizeHref(href, lang);
  if (href.startsWith("?")) return localizeHref(href, lang);
  throw new CmsContentError(
    "CMS_INVALID_REQUIRED_FIELD",
    `CMS navigation URL "${href}" is not a valid absolute or internal URL.`,
    ["home.navigation.href"],
    "home",
  );
}

export function SafeInternalLink({
  href,
  lang,
  children,
  className,
}: {
  href: string;
  lang: Lang;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={safeLocalizedHref(href, lang)} className={className}>
      {children}
    </Link>
  );
}
