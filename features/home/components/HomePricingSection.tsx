"use client";

import Image from "next/image";
import Section from "@/components/ui/Section";
import { CmsContractNotice } from "@/components/cms/CmsContractNotice";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { SafeInternalLink } from "./HomeLinks";

export function HomePricingSection({
  content,
  pricingDetailsLink,
  lang,
}: {
  content: HomeContent["pricingSummary"];
  pricingDetailsLink: HomeContent["pricingDetailsLink"];
  lang: Lang;
}) {
  return (
    <Section lang={lang}>
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold text-heading md:text-2xl">
            {t(content.heading, lang)}
          </h2>
          <div className="mt-6 flex flex-1 flex-col justify-center gap-4">
            <CmsContractNotice
              details="Atlas home-pricing-summary does not provide the course summary copy or extension note. Add those fields before rendering this content."
            />
            {pricingDetailsLink ? (
              <p className="text-base">
                <SafeInternalLink
                  href="/pricing"
                  lang={lang}
                  className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition hover:text-primary-mid hover:decoration-primary/60"
                >
                  {t(pricingDetailsLink, lang)}
                </SafeInternalLink>
              </p>
            ) : (
              <CmsContractNotice details="Atlas is missing home-pricing-summary.pricing_details_label." />
            )}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold text-heading md:text-2xl">
            {t(content.payment.heading, lang)}
          </h2>
          <p className="mt-3 text-base text-body">{t(content.payment.body, lang)}</p>

          <div className="mt-6 flex flex-1 flex-col rounded-xl bg-primary-light/60 p-4 sm:p-5">
            {content.payment.logos.length > 0 ? (
              <ul className="grid flex-1 grid-cols-2 content-center gap-3 sm:gap-4">
                {content.payment.logos.map((logo) => (
                  <li key={logo.mark} className="min-w-0">
                    <PaymentBrand src={logo.src} />
                  </li>
                ))}
              </ul>
            ) : (
              <QueryEmptyState title={t(queryStates.empty, lang)} className="border-0 bg-transparent shadow-none" />
            )}
            <p className="mt-4 text-center text-xs leading-relaxed text-muted sm:text-sm">
              {t(content.payment.settleNote, lang)}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function PaymentBrand({ src }: { src: string }) {
  return (
    <span className="flex h-full min-h-20 w-full items-center justify-center rounded-xl border border-border/80 bg-surface px-4 py-4 sm:min-h-24 sm:px-5 sm:py-5">
      <Image
        src={src}
        alt=""
        width={240}
        height={160}
        className="h-10 w-auto max-w-[7.5rem] object-contain sm:h-12 sm:max-w-[9rem]"
      />
    </span>
  );
}
