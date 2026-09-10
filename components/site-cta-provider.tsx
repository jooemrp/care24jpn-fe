"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Bilingual } from "@/constants/copy";
import { CmsContentError } from "@/features/cms/errors";

const SiteCtaContext = createContext<{ label: Bilingual; href: string } | undefined>(
  undefined,
);

export function SiteCtaProvider({
  primaryCta,
  primaryHref,
  children,
}: {
  primaryCta: Bilingual;
  primaryHref: string;
  children: ReactNode;
}) {
  return (
    <SiteCtaContext.Provider value={{ label: primaryCta, href: primaryHref }}>
      {children}
    </SiteCtaContext.Provider>
  );
}

function useSiteCta(): { label: Bilingual; href: string } {
  const value = useContext(SiteCtaContext);
  if (!value) {
    throw new CmsContentError(
      "CMS_MISSING_REQUIRED_FIELD",
      'Required CMS field "site.site-cta.primary" is unavailable.',
      ["site.site-cta.primary"],
      "site",
    );
  }
  return value;
}

export function useSitePrimaryCta(): Bilingual {
  return useSiteCta().label;
}

export function useSitePrimaryCtaHref(): string {
  const { href } = useSiteCta();
  if (!href) {
    throw new CmsContentError(
      "CMS_MISSING_REQUIRED_FIELD",
      'Required CMS field "site.site-cta.primary_href" is unavailable.',
      ["site.site-cta.primary_href"],
      "site",
    );
  }
  return href;
}
