"use client";

import Section from "@/components/ui/Section";
import PricingTable from "@/components/ui/PricingTable";
import { pricing as pricingCopy } from "@/constants/copy";
import { plans } from "@/constants/pricing";
import { useLang, t } from "@/context/LanguageContext";

export default function PricingPage() {
  const { lang } = useLang();

  return (
    <>
      <Section heading={pricingCopy.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(pricingCopy.hero.body, lang)}
        </p>
      </Section>

      <Section surface>
        <PricingTable plans={plans} note={pricingCopy.note} />
      </Section>
    </>
  );
}
