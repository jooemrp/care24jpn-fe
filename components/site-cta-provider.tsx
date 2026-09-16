"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cta as fallbackCta, type Bilingual } from "@/constants/copy";
import { CmsContentError } from "@/features/cms/errors";

type SiteCtaContextValue = {
  label: Bilingual;
  href: string;
  contactPhone: { display: string; tel: string; note: Bilingual };
  stickyPhoneLabel: Bilingual;
  stickyRequestLabel: Bilingual;
};

const SiteCtaContext = createContext<SiteCtaContextValue | undefined>(undefined);

export function SiteCtaProvider({
  primaryCta,
  primaryHref,
  contactPhone,
  stickyPhoneLabel,
  stickyRequestLabel,
  children,
}: {
  primaryCta: Bilingual;
  primaryHref: string;
  contactPhone: { display: string; tel: string; note: Bilingual };
  stickyPhoneLabel?: Bilingual;
  stickyRequestLabel?: Bilingual;
  children: ReactNode;
}) {
  return (
    <SiteCtaContext.Provider
      value={{
        label: primaryCta,
        href: primaryHref,
        contactPhone,
        // These labels are optional while the CMS field rollout catches up
        // with the published workspace; bundled values keep the shell usable.
        stickyPhoneLabel: stickyPhoneLabel ?? fallbackCta.stickyPhoneLabel,
        stickyRequestLabel: stickyRequestLabel ?? fallbackCta.stickyRequestLabel,
      }}
    >
      {children}
    </SiteCtaContext.Provider>
  );
}

function useSiteCta(): SiteCtaContextValue {
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

export function useSiteContactPhone(): {
  display: string;
  tel: string;
  note: Bilingual;
} {
  return useSiteCta().contactPhone;
}

export function useSiteStickyPhoneLabel(): Bilingual {
  return useSiteCta().stickyPhoneLabel;
}

export function useSiteStickyRequestLabel(): Bilingual {
  return useSiteCta().stickyRequestLabel;
}
