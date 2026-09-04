"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Bilingual } from "@/constants/copy";
import { CmsContentError } from "@/features/cms/errors";

const SiteCtaContext = createContext<Bilingual | undefined>(undefined);

export function SiteCtaProvider({
  primaryCta,
  children,
}: {
  primaryCta: Bilingual;
  children: ReactNode;
}) {
  return (
    <SiteCtaContext.Provider value={primaryCta}>
      {children}
    </SiteCtaContext.Provider>
  );
}

export function useSitePrimaryCta(): Bilingual {
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
