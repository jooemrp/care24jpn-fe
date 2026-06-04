"use client";

import Link from "next/link";
import Section from "@/components/ui/Section";
import StepFlow from "@/components/ui/StepFlow";
import { serviceFlow as fallback, cta } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import { findSection, getField } from "@/features/cms/mapping";
import type { BilingualPageData } from "@/features/cms/types";

export default function ServiceFlowView({ data }: { data?: BilingualPageData }) {
  const { lang } = useLangStore();

  const headingSection = data ? findSection(data.sections, "heading") : undefined;
  const stepsSection = data ? findSection(data.sections, "steps") : undefined;

  const heroHeading = getField(headingSection, "heading", lang) || t(fallback.hero.heading, lang);
  const heroBody = getField(headingSection, "sub_heading", lang) || t(fallback.hero.body, lang);
  const ctaButton = headingSection?.cta_buttons?.[0];
  const ctaLabel = ctaButton ? t(ctaButton.label, lang) : t(cta.primary, lang);
  const ctaUrl = ctaButton?.url || "/pricing";

  const steps = stepsSection?.items?.length
    ? stepsSection.items.map((item) => ({
        title: item.fields.title || { ja: "", en: "" },
        body: item.fields.description || { ja: "", en: "" },
      }))
    : fallback.steps;

  return (
    <>
      <Section heading={heroHeading ? { ja: heroHeading, en: heroHeading } : undefined}>
        {heroBody && (
          <p className="max-w-2xl text-base leading-relaxed text-body">{heroBody}</p>
        )}
      </Section>

      <Section surface>
        <StepFlow steps={steps} />
        <div className="mt-12 animate-fade-up">
          <Link
            href={ctaUrl}
            className="inline-flex bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
          >
            {ctaLabel}
          </Link>
        </div>
      </Section>
    </>
  );
}
