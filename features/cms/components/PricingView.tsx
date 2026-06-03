"use client";

import Section from "@/components/ui/Section";
import PricingTable from "@/components/ui/PricingTable";
import { pricing as fallbackPricing } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import { findSection, getField } from "@/features/cms/mapping";
import type { BilingualPageData } from "@/features/cms/types";

export default function PricingView({ data }: { data?: BilingualPageData }) {
  const { lang } = useLangStore();

  const headingSection = data ? findSection(data.sections, "heading") : undefined;
  const heroHeading = getField(headingSection, "heading", lang) || t(fallbackPricing.hero.heading, lang);
  const heroBody = getField(headingSection, "sub_heading", lang) || t(fallbackPricing.hero.body, lang);

  const highlightsSection = data ? findSection(data.sections, "highlights") : undefined;
  const highlights = highlightsSection?.items?.map((i) => i.fields.text?.[lang] ?? "") || [];

  const planSections = (data?.sections ?? []).filter(
    (s) => s.section_key.startsWith("plan_")
  );
  const feeService = (data?.services ?? []).find(
    (s) => s.slug === "additional-fees"
  );
  const noteSection = data ? findSection(data.sections, "note") : undefined;
  const noteText = getField(noteSection, "text", lang) || t(fallbackPricing.note, lang);

  return (
    <>
      <Section heading={heroHeading ? { ja: heroHeading, en: heroHeading } : undefined}>
        {heroBody && (
          <p className="max-w-2xl text-base leading-relaxed text-body">{heroBody}</p>
        )}
        {highlights.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-3">
            {highlights.map((h) => (
              <li key={h} className="rounded-full bg-accent-light px-4 py-1.5 text-xs font-medium text-accent">
                {h}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section surface>
        <PricingTable
          planSections={planSections}
          feeService={feeService}
          note={noteText}
        />
      </Section>
    </>
  );
}
