"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Bilingual } from "@/constants/copy";
import { CmsContentError } from "@/features/cms/errors";

type SiteCtaContextValue = {
  label: Bilingual;
  contactCta: Bilingual;
  href: string;
  contactPhone: { display: string; tel: string; note: Bilingual };
  stickyPhoneLabel: Bilingual;
  stickyRequestLabel: Bilingual;
};

const SiteCtaContext = createContext<SiteCtaContextValue | undefined>(undefined);

export function SiteCtaProvider({
  primaryCta,
  contactCta,
  primaryHref,
  contactPhone,
  stickyPhoneLabel,
  stickyRequestLabel,
  children,
}: {
  primaryCta: Bilingual;
  contactCta: Bilingual;
  primaryHref: string;
  contactPhone: { display: string; tel: string; note: Bilingual };
  stickyPhoneLabel: Bilingual;
  stickyRequestLabel: Bilingual;
  children: ReactNode;
}) {
  if (!contactCta || !stickyPhoneLabel || !stickyRequestLabel) {
    throw new CmsContentError(
      "CMS_MISSING_REQUIRED_FIELD",
      'Required CMS fields "site.site-cta.contact", "site.site-cta.sticky_phone_label", and "site.site-cta.sticky_request_label" are unavailable.',
      [
        "site.site-cta.contact",
        "site.site-cta.sticky_phone_label",
        "site.site-cta.sticky_request_label",
      ],
      "site",
    );
  }

  return (
    <SiteCtaContext.Provider
      value={{
        label: primaryCta,
        contactCta,
        href: primaryHref,
        contactPhone,
        stickyPhoneLabel,
        stickyRequestLabel,
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

export function useSiteContactCta(): Bilingual {
  return useSiteCta().contactCta;
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
